import json
import re
from gigachat import GigaChat
import os
from dotenv import load_dotenv

load_dotenv()

class GigaService:
    def __init__(self):
        # Отключаем проверку сертификатов для удобства локальной разработки
        self.giga = GigaChat(credentials=os.getenv("GIGACHAT_CREDENTIALS"), verify_ssl_certs=False)

    def generate_cards(self, text: str):
        prompt = f"""Ты — помощник в обучении. Проанализируй текст и выдели главные факты. 
        Создай на их основе карточки "Вопрос-Ответ". 
        Верни ТОЛЬКО JSON-массив объектов с полями "q" и "a".
        Пример: [{"q": "2+2?", "a": "4"}]
        Текст для анализа: {text[:3000]}"""
        
        res = self.giga.chat(prompt)
        content = res.choices[0].message.content
        
        # Очистка ответа от лишнего текста, если GigaChat его добавит
        match = re.search(r'\[.*\]', content, re.DOTALL)
        if match:
            return json.loads(match.group())
        return []