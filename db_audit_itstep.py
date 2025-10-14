#!/usr/bin/env python3
"""
Скрипт аудита базы данных itstep_final
Проверяет все таблицы, представления и материализованные представления
на полноту данных, актуальность и корректность структуры
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime, timedelta
import json

# Параметры подключения (замените на ваши из VS Code)
DB_CONFIG = {
    'host': '92.242.60.211',
    'port': 5432,
    'database': 'itstep_final',
    'user': 'YOUR_USERNAME',  # Замените на ваш username из VS Code
    'password': 'YOUR_PASSWORD'  # Замените на ваш password из VS Code
}

class DatabaseAuditor:
    def __init__(self, config):
        self.config = config
        self.conn = None
        self.issues = []

    def connect(self):
        """Подключение к базе данных"""
        try:
            self.conn = psycopg2.connect(**self.config)
            print(f"✅ Подключено к {self.config['database']}")
        except Exception as e:
            print(f"❌ Ошибка подключения: {e}")
            raise

    def get_all_schemas(self):
        """Получить список всех пользовательских схем"""
        query = """
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        ORDER BY schema_name;
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query)
            return [row['schema_name'] for row in cur.fetchall()]

    def get_tables_info(self, schema):
        """Получить информацию о таблицах в схеме"""
        query = """
        SELECT
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
            pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables
        WHERE schemaname = %s
        ORDER BY tablename;
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, (schema,))
            return cur.fetchall()

    def get_views_info(self, schema):
        """Получить информацию о представлениях в схеме"""
        query = """
        SELECT
            schemaname,
            viewname,
            definition
        FROM pg_views
        WHERE schemaname = %s
        ORDER BY viewname;
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, (schema,))
            return cur.fetchall()

    def get_matviews_info(self, schema):
        """Получить информацию о материализованных представлениях"""
        query = """
        SELECT
            schemaname,
            matviewname,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as total_size,
            pg_total_relation_size(schemaname||'.'||matviewname) as size_bytes
        FROM pg_matviews
        WHERE schemaname = %s
        ORDER BY matviewname;
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, (schema,))
            return cur.fetchall()

    def check_table_data(self, schema, table):
        """Проверить данные в таблице"""
        issues = []

        # Проверка 1: Таблица пустая?
        query_count = f"SELECT COUNT(*) as cnt FROM {schema}.{table}"
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query_count)
                count = cur.fetchone()['cnt']

                if count == 0:
                    issues.append({
                        'type': 'EMPTY_TABLE',
                        'severity': 'WARNING',
                        'schema': schema,
                        'object': table,
                        'message': f'Таблица {schema}.{table} пустая (0 записей)'
                    })

                # Проверка 2: Есть ли колонки с датами для проверки актуальности?
                query_columns = f"""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = %s AND table_name = %s
                AND (data_type LIKE '%%timestamp%%' OR data_type = 'date' OR column_name ILIKE '%%date%%' OR column_name ILIKE '%%created%%' OR column_name ILIKE '%%updated%%')
                """
                cur.execute(query_columns, (schema, table))
                date_columns = cur.fetchall()

                if date_columns and count > 0:
                    # Проверяем актуальность данных по первой найденной колонке даты
                    date_col = date_columns[0]['column_name']
                    query_max_date = f"SELECT MAX({date_col}) as max_date FROM {schema}.{table}"
                    cur.execute(query_max_date)
                    result = cur.fetchone()
                    max_date = result['max_date'] if result else None

                    if max_date:
                        days_old = (datetime.now() - max_date).days
                        if days_old > 7:  # Данные старше недели
                            issues.append({
                                'type': 'OUTDATED_DATA',
                                'severity': 'WARNING',
                                'schema': schema,
                                'object': table,
                                'message': f'Данные в {schema}.{table} устарели. Последняя дата: {max_date} ({days_old} дней назад)'
                            })

        except Exception as e:
            issues.append({
                'type': 'QUERY_ERROR',
                'severity': 'ERROR',
                'schema': schema,
                'object': table,
                'message': f'Ошибка при проверке {schema}.{table}: {str(e)}'
            })

        return issues

    def check_view_dependencies(self, schema, view):
        """Проверить зависимости представления"""
        issues = []

        # Проверка: можно ли выполнить SELECT из представления?
        query_test = f"SELECT * FROM {schema}.{view} LIMIT 1"
        try:
            with self.conn.cursor() as cur:
                cur.execute(query_test)
                cur.fetchone()
        except Exception as e:
            issues.append({
                'type': 'VIEW_ERROR',
                'severity': 'ERROR',
                'schema': schema,
                'object': view,
                'message': f'Представление {schema}.{view} не работает: {str(e)}'
            })

        return issues

    def check_matview_freshness(self, schema, matview):
        """Проверить актуальность материализованного представления"""
        issues = []

        # Получить время последнего обновления (если есть статистика)
        query_stats = """
        SELECT
            last_autovacuum,
            last_autoanalyze
        FROM pg_stat_user_tables
        WHERE schemaname = %s AND relname = %s
        """

        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Проверяем, можно ли прочитать из матвью
                query_test = f"SELECT COUNT(*) as cnt FROM {schema}.{matview}"
                cur.execute(query_test)
                count = cur.fetchone()['cnt']

                if count == 0:
                    issues.append({
                        'type': 'EMPTY_MATVIEW',
                        'severity': 'WARNING',
                        'schema': schema,
                        'object': matview,
                        'message': f'Материализованное представление {schema}.{matview} пустое'
                    })

        except Exception as e:
            issues.append({
                'type': 'MATVIEW_ERROR',
                'severity': 'ERROR',
                'schema': schema,
                'object': matview,
                'message': f'Ошибка при проверке {schema}.{matview}: {str(e)}'
            })

        return issues

    def run_audit(self):
        """Запустить полный аудит базы данных"""
        print("\n" + "="*80)
        print("🔍 АУДИТ БАЗЫ ДАННЫХ itstep_final")
        print("="*80 + "\n")

        self.connect()

        schemas = self.get_all_schemas()
        print(f"📊 Найдено схем: {len(schemas)}")
        print(f"   Схемы: {', '.join(schemas)}\n")

        total_tables = 0
        total_views = 0
        total_matviews = 0

        for schema in schemas:
            print(f"\n{'─'*80}")
            print(f"📁 Схема: {schema}")
            print(f"{'─'*80}")

            # Таблицы
            tables = self.get_tables_info(schema)
            total_tables += len(tables)
            if tables:
                print(f"\n  📋 Таблицы ({len(tables)}):")
                for table in tables:
                    print(f"     • {table['tablename']:<40} {table['total_size']:>10}")
                    # Проверяем каждую таблицу
                    table_issues = self.check_table_data(schema, table['tablename'])
                    self.issues.extend(table_issues)

            # Представления
            views = self.get_views_info(schema)
            total_views += len(views)
            if views:
                print(f"\n  👁️  Представления ({len(views)}):")
                for view in views:
                    print(f"     • {view['viewname']}")
                    # Проверяем каждое представление
                    view_issues = self.check_view_dependencies(schema, view['viewname'])
                    self.issues.extend(view_issues)

            # Материализованные представления
            matviews = self.get_matviews_info(schema)
            total_matviews += len(matviews)
            if matviews:
                print(f"\n  💎 Материализованные представления ({len(matviews)}):")
                for matview in matviews:
                    print(f"     • {matview['matviewname']:<40} {matview['total_size']:>10}")
                    # Проверяем каждое матвью
                    matview_issues = self.check_matview_freshness(schema, matview['matviewname'])
                    self.issues.extend(matview_issues)

        # Итоговая статистика
        print(f"\n\n{'='*80}")
        print("📊 ИТОГОВАЯ СТАТИСТИКА")
        print(f"{'='*80}")
        print(f"  Всего таблиц:                    {total_tables}")
        print(f"  Всего представлений:             {total_views}")
        print(f"  Всего материализованных представлений: {total_matviews}")
        print(f"  Всего объектов:                  {total_tables + total_views + total_matviews}")

        # Проблемы
        print(f"\n\n{'='*80}")
        print("⚠️  ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ")
        print(f"{'='*80}")

        if not self.issues:
            print("  ✅ Проблем не обнаружено!")
        else:
            # Группируем по типу
            errors = [i for i in self.issues if i['severity'] == 'ERROR']
            warnings = [i for i in self.issues if i['severity'] == 'WARNING']

            print(f"\n  ❌ Критические ошибки: {len(errors)}")
            for issue in errors:
                print(f"     [{issue['type']}] {issue['schema']}.{issue['object']}")
                print(f"        → {issue['message']}")

            print(f"\n  ⚠️  Предупреждения: {len(warnings)}")
            for issue in warnings:
                print(f"     [{issue['type']}] {issue['schema']}.{issue['object']}")
                print(f"        → {issue['message']}")

        # Сохраняем отчет в JSON
        report = {
            'audit_date': datetime.now().isoformat(),
            'database': self.config['database'],
            'statistics': {
                'total_tables': total_tables,
                'total_views': total_views,
                'total_matviews': total_matviews,
                'total_objects': total_tables + total_views + total_matviews
            },
            'issues': self.issues
        }

        with open('db_audit_report.json', 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2, default=str)

        print(f"\n\n📄 Полный отчет сохранен в: db_audit_report.json")

        self.conn.close()

if __name__ == '__main__':
    print("=" * 80)
    print("База данных: itstep_final - Аудит аналитических витрин")
    print("=" * 80)
    print("\n⚠️  ВНИМАНИЕ: Замените YOUR_USERNAME и YOUR_PASSWORD на ваши учетные данные!")
    print("   Учетные данные находятся в настройках подключения VS Code\n")

    auditor = DatabaseAuditor(DB_CONFIG)
    auditor.run_audit()
