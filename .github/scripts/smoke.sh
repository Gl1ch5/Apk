#!/usr/bin/env bash
# Смоук-тест: ставим APK, запускаем, ждём и проверяем, что процесс жив и краша нет.
set -uo pipefail

PKG="com.gl1ch5.weathergazette.debug"
ACT="$PKG/com.gl1ch5.weathergazette.MainActivity"
APK=$(ls app/build/outputs/apk/debug/*.apk | head -n1)

echo "▶ Установка $APK"
adb install -r "$APK" || { echo "::error::APK не установился"; exit 1; }

echo "▶ Ожидание загрузки системы"
adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do sleep 2; done
adb shell input keyevent 82 >/dev/null 2>&1 || true

echo "▶ Очистка логов и запуск"
adb logcat -c
adb shell am force-stop "$PKG" || true
adb shell am start -W -n "$ACT" || echo "::warning::am start вернул ненулевой код"
sleep 25

echo "▶ Проверка процесса"
PID=$(adb shell pidof "$PKG" | tr -d '\r' || true)
adb logcat -d > logcat.txt 2>/dev/null || true
adb logcat -d -b crash > crash.txt 2>/dev/null || true

echo "PID=$PID"
echo "--- интересные строки logcat ---"
grep -E "FATAL EXCEPTION|AndroidRuntime|WeatherGazette|ANR in|chromium" logcat.txt | tail -60 || true

fail=0
if grep -q "FATAL EXCEPTION" logcat.txt crash.txt 2>/dev/null; then
  echo "::error::FATAL EXCEPTION — приложение упало"
  grep -A 40 -m1 "FATAL EXCEPTION" logcat.txt crash.txt 2>/dev/null || true
  fail=1
fi
if [ -z "$PID" ]; then
  echo "::error::Процесс $PKG не найден после запуска (краш или ANR)"
  tail -80 crash.txt 2>/dev/null || true
  fail=1
fi

echo "▶ Скриншот"
adb exec-out screencap -p > screenshot.png 2>/dev/null || true
ls -lh screenshot.png 2>/dev/null || true

if [ "$fail" -ne 0 ]; then exit 1; fi
echo "✅ Приложение запустилось, процесс жив, крашей нет"
