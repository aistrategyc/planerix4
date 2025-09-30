#!/usr/bin/env python3
"""
API тестер для предотвращения JSON проблем
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8001/api"

def test_login():
    """Тестируем логин"""
    payload = {
        "email": "itstep@itstep.com",
        "password": "ITstep2025!"
    }

    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=payload)
        print(f"Login status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            token = data.get('access_token')
            if token:
                print(f"✅ Токен получен: {token[:20]}...")
                return token
            else:
                print(f"❌ Токен не найден в ответе: {data}")
                return None
        else:
            print(f"❌ Ошибка логина: {response.text}")
            return None

    except Exception as e:
        print(f"❌ Исключение при логине: {e}")
        return None

def test_profile(token):
    """Тестируем профиль"""
    if not token:
        print("❌ Нет токена для теста профиля")
        return

    headers = {"Authorization": f"Bearer {token}"}

    try:
        response = requests.get(f"{BASE_URL}/users/me", headers=headers)
        print(f"Profile status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Профиль получен: {data.get('email', 'no-email')}")
            return data
        else:
            print(f"❌ Ошибка профиля: {response.text}")
            return None

    except Exception as e:
        print(f"❌ Исключение при получении профиля: {e}")
        return None

def test_organizations(token):
    """Тестируем организации"""
    if not token:
        print("❌ Нет токена для теста организаций")
        return

    headers = {"Authorization": f"Bearer {token}"}

    try:
        response = requests.get(f"{BASE_URL}/orgs", headers=headers)
        print(f"Organizations status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Организации получены: {len(data)} шт.")
            return data
        else:
            print(f"❌ Ошибка организаций: {response.text}")
            return None

    except Exception as e:
        print(f"❌ Исключение при получении организаций: {e}")
        return None

def test_user_stats(token):
    """Тестируем статистику пользователя"""
    if not token:
        print("❌ Нет токена для теста статистики")
        return

    headers = {"Authorization": f"Bearer {token}"}

    try:
        response = requests.get(f"{BASE_URL}/users/me/stats", headers=headers)
        print(f"User stats status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Статистика получена: {json.dumps(data, indent=2)}")
            return data
        else:
            print(f"❌ Ошибка статистики: {response.text}")
            return None

    except Exception as e:
        print(f"❌ Исключение при получении статистики: {e}")
        return None

def main():
    print("=== Комплексное тестирование API ===")

    # Тестируем логин
    print("\n1. Тестируем аутентификацию...")
    token = test_login()

    # Тестируем профиль
    print("\n2. Тестируем профиль пользователя...")
    profile = test_profile(token)

    # Тестируем организации
    print("\n3. Тестируем организации...")
    organizations = test_organizations(token)

    # Тестируем статистику
    print("\n4. Тестируем статистику пользователя...")
    stats = test_user_stats(token)

    print("\n=== Тестирование завершено ===")

if __name__ == "__main__":
    main()