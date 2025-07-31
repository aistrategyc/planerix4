# apps/api/Dockerfile
FROM python:3.10-slim

WORKDIR /app

# 1) Копируем только мета-файлы проекта
COPY pyproject.toml poetry.lock /app/

# 2) Ставим Poetry и зависимости (без dev, без установки самого пакета)
RUN pip install --no-cache-dir poetry \
 && poetry config virtualenvs.create false \
 && poetry install --no-interaction --no-ansi --without dev --no-root

# 3) Копируем весь исходный код
COPY . /app

# 4) ENV-переменные
ENV PYTHONUNBUFFERED=1
ENV FASTAPI_ENV=production

# 5) Открываем порт
EXPOSE 8000

# 6) Стартуем приложение
CMD ["uvicorn", "liderix_api.main:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "info"]