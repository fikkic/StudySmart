import json
import re
from gigachat import GigaChat
import os
from dotenv import load_dotenv

load_dotenv()

class GigaService:
    def __init__(self):
        self.giga = GigaChat(
            credentials=os.getenv("GIGACHAT_CREDENTIALS"), 
            verify_ssl_certs=False, 
            scope="GIGACHAT_API_PERS"
        )

    def generate_cards(self, text: str, difficulty: str):
        # 1. Снижаем лимиты для стабильности
        settings = {
            "easy": {"count": "5", "style": "базовые факты"},
            "medium": {"count": "8", "style": "термины и логику"},
            "hard": {"count": "15", "style": "глубокий анализ"} 
        }
        conf = settings.get(difficulty, settings["easy"])

        try:
            # 2. Промпт с жестким ограничением
            prompt = f"""Ты — генератор тестов. Тема: {difficulty}. Нужно ровно {conf['count']} вопросов. 
            Ответ СТРОГО JSON массивом:
            [{{"q":"вопрос","o":["а","б","в","г"],"c":"а"}}]
            Важно: только JSON. В "c" пиши ПОЛНЫЙ ТЕКСТ правильного ответа.
            Текст для анализа: {text[:2500]}"""
            
            res = self.giga.chat(prompt)
            content = res.choices[0].message.content
            
            # 3. Очистка
            content = content.replace("```json", "").replace("```", "").strip()
            
            start = content.find("[")
            if start == -1: return []
            
            # Предварительная обрезка до возможного конца
            # Если есть явный конец ], берем до него
            end = content.rfind("]")
            if end != -1:
                json_str = content[start:end+1]
            else:
                json_str = content[start:]

            # 4. Попытка парсинга с авто-ремонтом
            try:
                data = json.loads(json_str)
            except json.JSONDecodeError:
                print("⚠️ JSON оборван, пытаюсь восстановить...")
                # Ищем последний "}," — это конец последнего успешного вопроса
                last_comma_brace = json_str.rfind("},")
                if last_comma_brace != -1:
                    # Отрезаем всё после последнего целого вопроса и закрываем массив
                    json_str = json_str[:last_comma_brace+1] + "]"
                    data = json.loads(json_str)
                else:
                    # Если совсем всё плохо
                    return []

            # 5. Преобразование ключей обратно в длинные
            formatted_data = []
            for item in data:
                # Проверка на целостность данных внутри вопроса
                if "q" in item and "o" in item and "c" in item:
                    formatted_data.append({
                        "question": item.get("q"),
                        "options": item.get("o"),
                        "correct": item.get("c")
                    })
            
            return formatted_data

        except Exception as e:
            print(f"CRITICAL ERROR ({difficulty}): {e}")
            return []