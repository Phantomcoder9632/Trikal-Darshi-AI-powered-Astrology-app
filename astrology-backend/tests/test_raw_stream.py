import os
import dotenv
from openai import OpenAI

dotenv.load_dotenv(override=True)

api_key = os.getenv("GEMINI_API_KEY")
base_url = "https://generativelanguage.googleapis.com/v1beta/openai/"
model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

client = OpenAI(api_key=api_key, base_url=base_url)

print("Starting raw Gemini test stream...")
try:
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Write a long story about a trip to the moon. Write at least 500 words."}
        ],
        max_tokens=4096,
        stream=True
    )
    for chunk in response:
        content = chunk.choices[0].delta.content
        if content:
            print(content, end="", flush=True)
except Exception as e:
    print("\nError:", e)
print("\nStream finished.")
