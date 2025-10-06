#!/bin/bash

# API тестер для предотвращения JSON проблем
BASE_URL="http://localhost:8001/api"

# Функция для безопасного POST запроса с JSON
api_post() {
    local endpoint="$1"
    local json_file="$2"

    curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        -d @"$json_file" \
        "$BASE_URL/$endpoint"
}

# Функция для безопасного GET запроса
api_get() {
    local endpoint="$1"
    local token="$2"

    if [ -n "$token" ]; then
        curl -s -H "Authorization: Bearer $token" "$BASE_URL/$endpoint"
    else
        curl -s "$BASE_URL/$endpoint"
    fi
}

# Функция логина
get_auth_token() {
    # Создаём временный JSON файл
    cat > /tmp/login.json << EOF
{
    "email": "itstep@itstep.com",
    "password": "ITstep2025!"
}
EOF

    # Выполняем запрос и извлекаем токен
    local response=$(api_post "auth/login" "/tmp/login.json")
    echo "$response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('access_token', ''))
except:
    print('')
" 2>/dev/null

    # Удаляем временный файл
    rm -f /tmp/login.json
}

# Тестируем логин
echo "=== Тестируем аутентификацию ==="
TOKEN=$(get_auth_token)
if [ -n "$TOKEN" ]; then
    echo "✅ Токен получен: ${TOKEN:0:20}..."
else
    echo "❌ Ошибка получения токена"
    exit 1
fi

# Тестируем профиль
echo -e "\n=== Тестируем профиль пользователя ==="
PROFILE_RESPONSE=$(api_get "users/me" "$TOKEN")
echo "Profile API response status: $(echo "$PROFILE_RESPONSE" | jq -r 'if type == "object" and has("id") then "✅ OK" else "❌ Error" end' 2>/dev/null || echo "❌ Invalid JSON")"

# Тестируем организации
echo -e "\n=== Тестируем организации ==="
ORGS_RESPONSE=$(api_get "orgs" "$TOKEN")
echo "Organizations API response status: $(echo "$ORGS_RESPONSE" | jq -r 'if type == "array" then "✅ OK - \(length) organizations" else "❌ Error" end' 2>/dev/null || echo "❌ Invalid JSON")"

# Тестируем статистику пользователя
echo -e "\n=== Тестируем статистику пользователя ==="
STATS_RESPONSE=$(api_get "users/me/stats" "$TOKEN")
echo "User stats API response status: $(echo "$STATS_RESPONSE" | jq -r 'if type == "object" then "✅ OK" else "❌ Error" end' 2>/dev/null || echo "❌ Invalid JSON")"

echo -e "\n=== Тест завершён ==="