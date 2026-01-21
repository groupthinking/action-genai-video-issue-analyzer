import whisper; model = whisper.load_model("base"); result = model.transcribe("audio.mp3")
import openai; openai.api_key = 'YOUR_API_KEY'; response = openai.Completion.create(engine="text-davinci-003", prompt=result["text"], max_tokens=150)
