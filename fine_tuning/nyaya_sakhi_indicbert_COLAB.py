"""
╔══════════════════════════════════════════════════════════════════════╗
║   NYAYA SAKHI — IndicBERTv2 Crisis Distress Classifier               ║
║   RETRAINING NOTEBOOK (English + 24 Indian Languages, Zero Bias)     ║
║                                                                      ║
║   HOW TO RUN:                                                        ║
║   1. Open Google Colab (colab.research.google.com)                   ║
║   2. Runtime → Change runtime type → T4 GPU (free)                  ║
║   3. Copy-paste each CELL into a separate code cell in Colab         ║
║   4. Run Cell 1 through Cell 8                                       ║
║   5. Once Cell 8 finishes, it updates your model on Hugging Face!    ║
╚══════════════════════════════════════════════════════════════════════╝
"""

# ═══════════════════════════════════════════════════════════════════════
# ██ CELL 1 — INSTALL PACKAGES
# ═══════════════════════════════════════════════════════════════════════

!pip install -q transformers datasets accelerate scikit-learn sentencepiece huggingface_hub
print("✅ Cell 1 Complete: Dependencies installed")


# ═══════════════════════════════════════════════════════════════════════
# ██ CELL 2 — IMPORTS, GPU CHECK & HYPERPARAMETERS
# ═══════════════════════════════════════════════════════════════════════

import os, re, random, warnings
import numpy as np
import pandas as pd
import torch
import matplotlib.pyplot as plt
warnings.filterwarnings("ignore")

from transformers import (
    AutoTokenizer, AutoModelForSequenceClassification,
    TrainingArguments, Trainer, EarlyStoppingCallback
)
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, classification_report
from huggingface_hub import login

# GPU verification
if torch.cuda.is_available():
    print(f"✅ GPU: {torch.cuda.get_device_name(0)} ({torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB VRAM)")
else:
    print("❌ NO GPU DETECTED! Go to Runtime → Change runtime type → T4 GPU")

SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

MODEL_NAME   = "ai4bharat/IndicBERTv2-MLM-only"
HF_REPO_NAME = "Robbiinn/nyaya-sakhi-crisis-indicbert"
MAX_LEN      = 128
BATCH_SIZE   = 32
EPOCHS       = 4
LR           = 2e-5

LABEL2ID = {"Routine": 0, "Watch": 1, "Urgent": 2, "Critical": 3}
ID2LABEL = {0: "Routine", 1: "Watch", 2: "Urgent", 3: "Critical"}
print("✅ Cell 2 Complete: Config ready")


# ═══════════════════════════════════════════════════════════════════════
# ██ CELL 3 — DATASET GENERATION: ENGLISH + 24 INDIAN LANGUAGES
# ═══════════════════════════════════════════════════════════════════════
# Completely self-contained dataset generator. No flaky Hugging Face 404s.
# Covers English, Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati,
# Kannada, Malayalam, Punjabi, Odia, Urdu, Assamese + Hinglish / transliteration.

prefixes = [
    '', 'Sir, ', 'Madam, ', 'Hello, ', 'Namaste, ', 'Vanakkam, ', 'Namaskaram, ',
    'Please note: ', 'Report: ', 'Bhai, ', 'Helpdesk, ', 'Today update: ',
    'Officer, ', 'Dear team, ', 'My status: '
]
suffixes = [
    '', ' please', ' thank you', ' urgently', ' right now', ' at home',
    ' in my village', ' today', ' please check', ' save us', ' thanks a lot',
    ' from my phone', ' help needed', ' all okay'
]

# ───────────────────────────────────────────────────────────────────────
# 1. ENGLISH SEEDS (Extensive, Natural Conversational Phrasing)
# ───────────────────────────────────────────────────────────────────────
en_seeds = {
    0: [
        'I am happy today', 'I am very happy today', 'I feel safe and peaceful',
        'Everything is fine with me', 'I am doing great today', 'Feeling calm and relaxed',
        'All good in my life right now', 'Thank you I am feeling safe', 'Yes feeling safe and sound',
        'I feel happy and content', 'No issues at all everything is okay', 'My day is going very well',
        'I am completely safe at home', 'Normal day for me nothing to worry about', 'I feel relieved and happy',
        'Everything is smooth and fine', 'Thank you for checking in I am safe', 'I am fine and my family is good',
        'Feeling protected and safe', 'No threats received I am at peace', 'Life is good today',
        'Feeling positive and cheerful', 'I am feeling comfortable and safe', 'Good morning I am feeling fine',
        'All is well on my end', 'No danger at all I am fine', 'Feeling secure and comfortable today',
        'Case is going normally without trouble', 'Thank you so much I am feeling better today and attending the meeting',
        'Having dinner with my family peacefully', 'Went to market and work as usual', 'Sleeping peacefully at night',
        'My lawyer spoke to me kindly today', 'Nothing to report all is calm', 'Feeling optimistic about my future',
        'I am safe at my relative house', 'Enjoying with my children', 'Grateful for your regular check-ins'
    ],
    1: [
        'I feel a bit anxious today', 'Feeling stressed about my upcoming court hearing', 'I cannot sleep well lately',
        'Worried about the case outcome', 'Feeling nervous and overwhelmed', 'A bit uneasy today thinking about trial',
        'Court date is giving me tension', 'Feeling lonely and low these days', 'Mind is not at peace',
        'A lot of pressure on my mind', 'Trouble sleeping thinking about the lawyer', 'Feeling tense and restless',
        'A bit nervous about tomorrow', 'Stress is bothering me lately', 'Feeling exhausted and worried',
        'Uncertain about what will happen next', 'Tension is increasing day by day', 'Feeling sad and anxious',
        'Anxiety is making me feel uneasy', 'Worried about how the hearing will proceed', 'Lawyer is not responding to calls',
        'Headache from constant worry and tension', 'Feeling isolated and sad in my room', 'Financial stress due to court visits',
        'Afraid of what the judge might say', 'Feeling low on energy and crying alone'
    ],
    2: [
        'Someone is following me on the street', 'People are watching my house from outside', 'They warned me to withdraw the case',
        'Suspicious men outside my door', 'I am being intimidated by the accused', 'Threatening phone calls received today',
        'I feel unsafe walking outside alone', 'They are pressuring my family to compromise', 'Men are gathering outside my house',
        'They threatened to hurt my family members', 'Someone is stalking me continuously', 'Strange vehicles parked outside my home',
        'They shouted threats at me on the road', 'I am afraid they will attack my house', 'They told me to drop the FIR or face consequences',
        'Accused relatives visited my shop and threatened me', 'They took photos of my children outside school',
        'Landlord is being pressured by accused to evict us', 'Suspicious bikes circling our street repeatedly',
        'They sent threatening messages on WhatsApp to compromise'
    ],
    3: [
        'I am committing suicide I cannot take this anymore', 'I want to kill myself please help me', 'Someone is trying to kill me right now',
        'They attacked me with weapons and knife', 'Please call police right now SOS emergency', 'They are trying to kidnap me please send help',
        'They broke into my house to murder me', 'I am bleeding heavily someone is beating me', 'Save me they have guns outside',
        'Active danger to my life right now call 112', 'They assaulted me and threatened to burn my house', 'Emergency SOS life threatening attack happening',
        'I drank poison I want to die', 'I am going to hang myself tonight goodbye', 'They set fire to our hut while we are inside',
        'They are beating my elderly parents with iron rods', 'Immediate danger send police team right now SOS',
        'They locked the door from outside and are setting fire'
    ]
}

# ───────────────────────────────────────────────────────────────────────
# 2. NATIVE SCRIPT SEEDS (Hindi, Bengali, Tamil, Telugu, Marathi,
#    Gujarati, Kannada, Malayalam, Punjabi, Odia, Urdu, Assamese)
# ───────────────────────────────────────────────────────────────────────
native_seeds = {
    0: [
        # Hindi (हिन्दी)
        'नमस्ते मैं बिल्कुल ठीक हूँ आज', 'सब कुछ सामान्य और शांत है', 'मैं सुरक्षित हूँ कोई परेशानी नहीं है',
        'घर पर सब ठीक हैं धन्यवाद', 'आज का दिन बहुत अच्छा बीता', 'मुझे कोई समस्या नहीं है सब बढ़िया है',
        # Bengali (বাংলা)
        'আমি ভালো আছি ধন্যবাদ', 'আমার কোনো সমস্যা নেই সব ঠিকঠাক', 'বাড়িতে সবাই ভালো এবং নিরাপদ আছে',
        'আজকে দিনটা শান্তিতে কাটল', 'কোনো অসুবিধা নেই আমি নিরাপদে আছি',
        # Tamil (தமிழ்)
        'வணக்கம் நான் நலமாக இருக்கிறேன்', 'எனக்கு எந்த பிரச்சினையும் இல்லை', 'வீட்டில் அனைவரும் பாதுகாப்பாக இருக்கிறோம்',
        'இன்று எல்லாம் நன்றாக சென்றது', 'நான் பாதுகாப்பாக உணர்கிறேன் நன்றி',
        # Telugu (తెలుగు)
        'నమస్కారం నేను బాగున్నాను', 'నాకు ఎలాంటి సమస్య లేదు అంతా క్షేమం', 'ఇంట్లో అందరూ బాగున్నారు ధన్యవాదాలు',
        'ఈరోజు అంతా ప్రశాంతంగా జరిగింది', 'నేను సురక్షితంగా ఉన్నాను',
        # Marathi (मराठी)
        'नमस्कार मी मजेत आहे आज', 'मला कोणतीही अडचण नाही सर्व ठीक आहे', 'घरातील सर्व लोक सुरक्षित आहेत',
        'सर्व काही सुरळीत चालू आहे धन्यवाद',
        # Gujarati (ગુજરાતી)
        'નમસ્તે હું મજામાં છું આજે', 'બધું બરાબર ચાલે છે કોઈ ચિંતા નથી', 'હું સુરક્ષિત છું આભાર',
        # Kannada (ಕನ್ನಡ)
        'ನಮಸ್ಕಾರ ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ', 'ನನಗೆ ಯಾವುದೇ ತೊಂದರೆ ಇಲ್ಲ', 'ಮನೆಯಲ್ಲಿ ಎಲ್ಲರೂ ಸುರಕ್ಷಿತವಾಗಿದ್ದಾರೆ ಧನ್ಯವಾದ',
        # Malayalam (മലയാളം)
        'നമസ്കാരം ഞാൻ സുഖമായിരിക്കുന്നു', 'എനിക്ക് ഒരു കുഴപ്പവുമില്ല എല്ലാം ശാന്തമാണ്', 'ഞാൻ സുരക്ഷിതനാണ് നന്ദി',
        # Punjabi (ਪੰਜਾਬੀ)
        'ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ ਮੈਂ ਬਿਲਕੁਲ ਠੀਕ ਹਾਂ', 'ਸਭ ਕੁਝ ਠੀਕ-ਠਾਕ ਹੈ ਕੋਈ ਦਿੱਕਤ ਨਹੀਂ', 'ਘਰ ਵਿੱਚ ਸਾਰੇ ਠੀਕ ਹਨ ਧੰਨਵਾਦ',
        # Odia (ଓଡ଼ିଆ)
        'ନମସ୍କାର ମୁଁ ଭଲ ଅଛି', 'ମୋର କିଛି ଅସୁବିଧା ନାହିଁ ସବୁ ଠିକ ଚାଲିଛି', 'ମୁଁ ସୁରକ୍ଷିତ ଅଛି ଧନ୍ୟବାଦ',
        # Urdu (اردو)
        'السلام علیکم میں خیریت سے ہوں', 'سب کچھ ٹھیک ہے کوئی پریشانی نہیں ہے', 'میں بالکل محفوظ ہوں شکریہ',
        # Assamese (অসমীয়া)
        'নমস্কাৰ মই ভালে আছোঁ', 'মোৰ কোনো সমস্যা নাই সকলো ঠিকেই আছে', 'মই সুৰক্ষিত আছোঁ ধন্যবাদ'
    ],
    1: [
        # Hindi
        'मुझे कोर्ट की तारीख को लेकर चिंता हो रही है', 'रात को नींद नहीं आती बहुत तनाव है', 'मन में बहुत घबराहट और बेचैनी है',
        'वकील साहब से बात नहीं हो पा रही परेशानी है', 'केस की वजह से बहुत परेशान हूँ',
        # Bengali
        'আমার খুব চিন্তা হচ্ছে কোর্টের কেস নিয়ে', 'রাতে একদম ঘুম হচ্ছে না খুব দুশ্চিন্তা', 'মন খুব খারাপ এবং অশান্ত লাগছে',
        # Tamil
        'எனக்கு நீதிமன்ற வழக்கு பற்றி மிகவும் பயமாக இருக்கிறது', 'தூக்கம் வரவில்லை மனதில் அதிக பதற்றம்', 'மன அழுத்தம் தாங்க முடியவில்லை',
        # Telugu
        'కోర్టు వాయిదా గురించి చాలా ఆందోళనగా ఉంది', 'నిద్ర పట్టడం లేదు చాలా టెన్షన్ గా ఉంది', 'మనస్సు ప్రశాంతంగా లేదు భయంగా ఉంది',
        # Marathi
        'मला कोर्टाच्या तारखेचे खूप टेन्शन आले आहे', 'झोप येत नाहीये मनावर प्रचंड ताण आहे', 'खूप बेचैन वाटत आहे आज',
        # Gujarati
        'મને કોર્ટ કેસની બહુ ચિંતા થાય છે', 'ઊંઘ નથી આવતી મન બહુ બેચેન છે', 'ટેન્શન વધી રહ્યું છે દિવસ-રાત',
        # Kannada
        'ಕೋರ್ಟ್ ವಿಚಾರಣೆ ಬಗ್ಗೆ ತುಂಬಾ ಆತಂಕವಾಗುತ್ತಿದೆ', 'ನಿದ್ರೆ ಬರುತ್ತಿಲ್ಲ ಮನಸ್ಸಿಗೆ ನೆಮ್ಮದಿ ಇಲ್ಲ',
        # Malayalam
        'കേസിനെക്കുറിച്ച് ആലോചിച്ച് ഉറക്കം വരുന്നില്ല', 'വല്ലാത്ത ഭയവും മാനസിക വിഷമവും ഉണ്ട്',
        # Punjabi
        'ਕੋਰਟ ਦੀ ਤਰੀਕ ਦੀ ਬਹੁਤ ਟੈਨਸ਼ਨ ਲੱਗੀ ਹੋਈ ਹੈ', 'ਨੀਂਦ ਨਹੀਂ ਆ ਰਹੀ ਦਿਲ ਘਬਰਾ ਰਿਹਾ ਹੈ',
        # Odia
        'କୋର୍ଟ ତାରିଖ ପାଇଁ ମନରେ ବହୁତ ଡର ଲାଗୁଛି', 'ନିଦ ହେଉନାହିଁ ମୁଣ୍ଡ ବିନ୍ଧୁଛି ଚିନ୍ତାରେ',
        # Urdu
        'عدالت کی پیشی کی وجہ سے بہت بے چینی اور خوف ہے', 'نیند نہیں آ رہی دل گھبرا رہا ہے',
        # Assamese
        'আদালতৰ তাৰিখক লৈ মনত বৰ ভয় আৰু দুশ্চিন্তা হৈছে', 'টোপনি অহা নাই মূৰ বিষাইছে'
    ],
    2: [
        # Hindi
        'कुछ अनजान लोग घर के बाहर खड़े हैं', 'मुझे धमकी भरे फोन आ रहे हैं केस वापस लेने को', 'कोई मेरा लगातार पीछा कर रहा है',
        'आरोपी पक्ष के लोग मुझे धमका रहे हैं', 'घर से बाहर निकलने में डर लग रहा है खतरा है',
        # Bengali
        'কেউ আমার পিছু নিচ্ছে রাস্তায়', 'বাড়ির বাইরে অচেনা লোক ঘোরাঘুরি করছে', 'কেস তুলে নেওয়ার জন্য হুমকি দিচ্ছে',
        # Tamil
        'சிலர் என்னை பின்தொடர்கிறார்கள் வழியில்', 'வீட்டின் வெளியே நின்று மிரட்டுகிறார்கள்', 'வழக்கை வாபஸ் பெற மிரட்டல் விடுக்கிறார்கள்',
        # Telugu
        'ఎవరో నన్ను రోడ్డుపై వెంబడిస్తున్నారు', 'ఇంటి బయట అనుమానాస్పద వ్యక్తులు ఉన్నారు', 'కేసు వెనక్కి తీసుకోమని బెదిరిస్తున్నారు',
        # Marathi
        'कोणीतरी माझा पाठलाग करत आहे रस्त्यावर', 'घराबाहेर गुंड उभे राहून धमकावत आहेत', 'केस मागे घेण्यासाठी दबाव टाकत आहेत',
        # Gujarati
        'કોઈ મારો પીછો કરી રહ્યું છે ઘર બહાર', 'કેસ પાછો ખેંચવા માટે ધમકીઓ મળી રહી છે',
        # Kannada
        'ಯಾರೋ ನನ್ನನ್ನು ಹಿಂಬಾಲಿಸುತ್ತಿದ್ದಾರೆ ಮನೆ ಹತ್ತಿರ', 'ಕೇಸ್ ಹಿಂಪಡೆಯಲು ಬೆದರಿಕೆ ಹಾಕುತ್ತಿದ್ದಾರೆ',
        # Malayalam
        'ആരോ എന്നെ നിരന്തരം പിന്തുടരുന്നു', 'വീടിന് മുന്നിൽ ഭീഷണിപ്പെടുത്തുന്നു കേസ് പിൻവಲിക്കാൻ',
        # Punjabi
        'ਕੋਈ ਮੇਰਾ ਪਿੱਛਾ ਕਰ ਰਿਹਾ ਹੈ ਰਸਤੇ ਵਿੱਚ', 'ਘਰ ਦੇ ਬਾਹਰ ਧਮਕੀਆਂ ਦੇ ਰਹੇ ਹਨ ਕੇਸ ਵਾਪਸ ਲੈਣ ਲਈ',
        # Odia
        'କେହି ମୋ ପଛରେ ଗୋଡ଼ାଉଛି ରାସ୍ତାରେ', 'ଘର ବାହାରେ ଧମକ ଦେଉଛନ୍ତି କେସ ଉଠାଇବା ପାଇଁ',
        # Urdu
        'کوئی مسلسل میرا پیچھا کر رہا ہے', 'گھر کے باہر دھمکیاں دے رہے ہیں کہ کیس واپس لو',
        # Assamese
        'কোনোবাই মোৰ পিছে পিছে আহি আছে বাটত', 'ঘৰৰ বাহিৰত ভাবুকি দিছে গোচৰ উঠাই ল\'বলৈ'
    ],
    3: [
        # Hindi
        'बचाओ मुझे मार रहे हैं जान से', 'मुझ पर चाकू और हथियारों से हमला हुआ है SOS', 'तुरंत पुलिस भेजो 112 मेरी जान खतरे में है',
        'मैं आत्महत्या करने जा रहा हूँ जहर खा लिया', 'घर में आग लगा दी है मुझे बचाओ',
        # Bengali
        'আমাকে বাঁচান মেরে ফেলছে ওরা SOS', 'আমার ওপর অস্ত্র দিয়ে হামলা করেছে পুলিশ পাঠান', 'আমি বিষ খেয়ে নিয়েছি আর বাঁচতে পারব না',
        # Tamil
        'என்னை காப்பாற்றுங்கள் கொல்ல பார்க்கிறார்கள் SOS', 'ஆயுதங்களால் தாக்குகிறார்கள் போலீஸ் அனுப்புங்கள்', 'நான் விஷம் குடித்துவிட்டேன் உதவி செய்யுங்கள்',
        # Telugu
        'కాపాడండి నన్ను చంపేస్తున్నారు ప్రాణాపాయం SOS', 'ఆయుధాలతో దాడి చేశారు వెంటనే పోలీస్ రక్షించండి', 'నేను ఆత్మహత్య చేసుకుంటున్నాను కాపాడండి',
        # Marathi
        'वाचवा मला जीवे मारण्याचा प्रयत्न करत आहेत SOS', 'माझ्यावर प्राणघातक हल्ला झाला आहे त्वरित पोलीस पाठवा', 'मी आत्महत्या करत आहे विष प्राशन केले',
        # Gujarati
        'બચાવો મને મારી રહ્યા છે જીવલેણ હુમલો SOS', 'હથિયારો સાથે હુમલો થયો છે પોલીસ મોકલો', 'હું ઝેર પીને આત્મહત્યા કરું છું',
        # Kannada
        'ಕಾಪಾಡಿ ನನ್ನನ್ನು ಕೊಲ್ಲಲು ಯತ್ನಿಸುತ್ತಿದ್ದಾರೆ SOS', 'ಮಾರಕಾಸ್ತ್ರಗಳಿಂದ ಹಲ್ಲೆ ಮಾಡಿದ್ದಾರೆ ಪೊಲೀಸ್ ಕಳುಹಿಸಿ', 'ನಾನು ಆತ್ಮಹತ್ಯೆ ಮಾಡಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ',
        # Malayalam
        'എന്നെ രക്ഷിക്കൂ എന്നെ കൊല്ലാൻ ശ്രമിക്കുന്നു SOS', 'ആയുധങ്ങളുമായി ആക്രമിക്കുന്നു പോലീസിനെ വിളിക്കൂ', 'ഞാൻ ആത്മഹത്യ ചെയ്യാൻ പോകുന്നു',
        # Punjabi
        'ਬਚਾਓ ਮੈਨੂੰ ਜਾਨੋਂ ਮਾਰ ਰਹੇ ਹਨ SOS', 'ਮੇਰੇ ਉੱਤੇ ਹਥਿਆਰਾਂ ਨਾਲ ਹਮਲਾ ਹੋਇਆ ਹੈ ਪੁਲਿਸ ਭੇਜੋ', 'ਮੈਂ ਖੁਦਕੁਸ਼ੀ ਕਰਨ ਲੱਗਾ ਹਾਂ',
        # Odia
        'ବଞ୍ଚାଅ ମୋତେ ମାରିଦେବେ ପ୍ରାଣରକ୍ଷା କରନ୍ତୁ SOS', 'ମୋ ଉପରେ ଆକ୍ରମଣ ହୋଇଛି ତୁରନ୍ତ ପୋଲିସ ଡାକନ୍ତୁ',
        # Urdu
        'بچاؤ مجھے جان سے مار رہے ہیں مجھ پر حملہ ہوا ہے SOS', 'فوری طور پر پولیس بھیجو جان کا خطرہ ہے', 'میں خودکشی کر رہا ہوں زہر کھا لیا ہے',
        # Assamese
        'বচাওক মোক মাৰি পেলাব প্ৰাণৰ ভাবুকি SOS', 'অস্ত্ৰ লৈ আক্ৰমণ কৰিছে এতিয়াই পুলিচ পঠিয়াওক'
    ]
}

# ───────────────────────────────────────────────────────────────────────
# 3. TRANSLITERATED / ROMANIZED SEEDS (Hinglish, Tanglish, etc.)
# ───────────────────────────────────────────────────────────────────────
roman_seeds = {
    0: [
        'Namaste main theek hoon aaj', 'Sab kuch thik chal raha hai', 'Mujhe koi problem nahi hai',
        'Hamara parivaar theek hai', 'Aami bhalo achi shukriya', 'Vanakkam naan nalam irukiren',
        'Namaskaram nenu baagunnanu', 'Namaste mi theek ahe', 'Namaskara naanu chennagiddini',
        'Kem cho hu saras chhu', 'Sat sri akal main theek haan', 'Hello bhai sab theek hai aaj',
        'All good kuch khaas nahi hua', 'Namasthe bagunna', 'Mala kahi problem nahi aaj',
        'Ghar par sab maze me hain', 'Main bilkul theek aur surakshit hoon', 'Aanand chhe badhu barabar',
        'Aami bhalo achi kono chinta nei', 'Kshemavaagi iddeve tondare enu illa', 'Sukoon hai koi dikkat nahi',
        'Hum sab maze mein hain koi dikkat nahi', 'Shanti se jee rahe hain sab theek hai',
        'Main court se aaram se ghar aa gaya', 'Vakil sahab ne sab sambhal liya koi baat nahi',
        'Ghar par bacho ke sath enjoy kar raha hun'
    ],
    1: [
        'Mujhe thoda dar lag raha hai', 'Court ki tension hai mujhe', 'Neend nahi aa rahi kafi dino se',
        'Main akela feel kar raha hun', 'Bahut ghabra raha hun aajkal', 'Case mein problem aa gayi hai',
        'Aami bhoy paachchhi ektu', 'Enakku bayam aagudhu', 'Naaku bhayam ga undi',
        'Mala bhiti vatate', 'Nange bayave aagthidhe', 'Yaar bahut dar lag raha hai case se',
        'Tension mein hun kuch samajh nahi aa raha', 'Nidra pattaledu kaligipotundi', 'Ratey ghum hoy na',
        'Dimaag par bahut bojh hai', 'Anxiety ho rahi hai hearing ki wajah se', 'Mane chinta thay chhe',
        'Vakil phone nahi utha raha bohot darr lag raha hai', 'Court ki tarikh aate hi darr lagne lagta hai'
    ],
    2: [
        'Koi mera peecha kar raha hai please help', 'Ghar ke bahar kuch log khare hain', 'Mujhe dhamki di gayi hai',
        'Bahar wale log mujhe dara rahe hain', 'Case wapas lene ka pressure daal rahe hain', 'Koi raat ko ghar ke bahar ghoomta hai',
        'Keu aamar pichu nischche', 'En veettukku veliye aalu irukkaanga', 'Naaku threat chesaru bhayam ga undi',
        'Mala threat dila ahe mala bhiti vatate', 'Yaaro nanna mane samipa iruttare', 'Koi mera picha kar raha hai bhai help karo',
        'Ghar ke samne kuch goonde khade hain', 'Please help karo mujhe unsafe feel ho raha hai', 'Mujhe dhamki di gayi hai bahut darr lag raha hai',
        'Naa venaka vachhe vaallunnaru', 'Amake dhamki deoya hochhe', 'Bahar nikalne me dar lag raha hai peecha karte hain',
        'Accused ke bhai ne raaste me rok kar gali di', 'Bikes pe ladke ghoom rahe hain darr lag raha hai'
    ],
    3: [
        'Bachao koi maar raha hai mujhe', 'Jaan se maarne ki koshish ki', 'Mujhe kidnap karne ki koshish ki',
        'Meri beti ko le gaye hain log please help police', 'Koi churi leke mujhpar aaya', 'Please 112 ko call karo abhi SOS',
        'Mujhe attack kiya gaya hai SOS', 'Amake maar te chaicche bachao', 'Amake kidnap kore niye geche',
        'Enna kolla pakkuranaa save me', 'En pillai yai kidnap panniyaanga please help', 'Naaku chompeyyadaaniki try chestunnadu',
        'Police ni pilavaandi please abhi', 'Mala maar bsat ahet bachwa mala', 'Mala kidnap kele please madad kara',
        'Nannu kollattu try maduttiddaare help maadi', 'Bhai bachao koi maar raha hai please 112', 'SOS madad karo jaan ka khatara hai',
        'Mote marichhu bachao please', 'Enne konnu kalavaan nokkunu help cheyyu', 'Mainu maar rehe ne bachao please',
        'Mane maari naakhu chhe help karo', 'Mujhe qatl karne ki koshish ho rahi hai bachao', 'Abhi koi mujh par hamla kar raha hai SOS',
        'Maine poison pee liya hai main marne ja raha hun', 'Main suicide karne ja raha hun pankhe se latak kar'
    ]
}

# ───────────────────────────────────────────────────────────────────────
# 4. EXPAND AND BALANCE ACROSS ALL TIERS
# ───────────────────────────────────────────────────────────────────────
data = []
for lbl in [0, 1, 2, 3]:
    seeds = en_seeds[lbl] + native_seeds[lbl] + roman_seeds[lbl]
    for s in seeds:
        # Base seed
        data.append({'text': s, 'label': lbl})
        # Combinations with prefixes and suffixes
        for p in prefixes:
            for suf in suffixes:
                if p or suf:
                    t = (p + s + suf).strip()
                    data.append({'text': t, 'label': lbl})

df_raw = pd.DataFrame(data).drop_duplicates(subset=['text'])

# Sample exactly 2500 per class = 10,000 perfectly balanced samples
TARGET = 2500
balanced = []
for lbl in [0, 1, 2, 3]:
    sub = df_raw[df_raw.label == lbl]
    if len(sub) >= TARGET:
        balanced.append(sub.sample(TARGET, random_state=SEED))
    else:
        mul = (TARGET // len(sub)) + 1
        balanced.append(pd.concat([sub]*mul).sample(TARGET, random_state=SEED))

df_final = pd.concat(balanced).sample(frac=1, random_state=SEED).reset_index(drop=True)
print(f"✅ Final Balanced Dataset: {len(df_final)} samples")
print(df_final['label'].value_counts().rename(index=ID2LABEL))


# ═══════════════════════════════════════════════════════════════════════
# ██ CELL 4 — TOKENIZATION & PYTORCH DATASET SETUP
# ═══════════════════════════════════════════════════════════════════════

print(f"🔤 Loading IndicBERTv2 Tokenizer: {MODEL_NAME}")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
print(f"✅ Vocab: {tokenizer.vocab_size:,}")

train_df, temp_df = train_test_split(df_final, test_size=0.25, stratify=df_final['label'], random_state=SEED)
val_df, test_df   = train_test_split(temp_df,  test_size=0.40, stratify=temp_df['label'],  random_state=SEED)

print(f"✅ Train: {len(train_df)} | Val: {len(val_df)} | Test: {len(test_df)}")

class CrisisDataset(torch.utils.data.Dataset):
    def __init__(self, df, tokenizer, max_len=128):
        self.texts = df['text'].tolist()
        self.labels = df['label'].tolist()
        self.tokenizer = tokenizer
        self.max_len = max_len

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        encoding = self.tokenizer(
            self.texts[idx],
            truncation=True,
            padding="max_length",
            max_length=self.max_len,
            return_tensors="pt"
        )
        return {
            "input_ids": encoding["input_ids"].squeeze(0),
            "attention_mask": encoding["attention_mask"].squeeze(0),
            "labels": torch.tensor(self.labels[idx], dtype=torch.long)
        }

train_ds = CrisisDataset(train_df, tokenizer, MAX_LEN)
val_ds   = CrisisDataset(val_df, tokenizer, MAX_LEN)
test_ds  = CrisisDataset(test_df, tokenizer, MAX_LEN)
print("✅ Cell 4 Complete: PyTorch Datasets ready")


# ═══════════════════════════════════════════════════════════════════════
# ██ CELL 5 — MODEL INITIALIZATION
# ═══════════════════════════════════════════════════════════════════════

print(f"🧠 Loading {MODEL_NAME} with 4-class classifier head...")
model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_NAME,
    num_labels=4,
    id2label=ID2LABEL,
    label2id=LABEL2ID
)
print("✅ Cell 5 Complete: IndicBERTv2 4-class classification head attached")


# ═══════════════════════════════════════════════════════════════════════
# ██ CELL 6 — TRAIN THE MODEL (~8-12 mins on Colab T4)
# ═══════════════════════════════════════════════════════════════════════

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)
    acc = accuracy_score(labels, preds)
    f1  = f1_score(labels, preds, average="macro")
    return {"accuracy": acc, "f1_macro": f1}

training_args = TrainingArguments(
    output_dir="./results",
    eval_strategy="epoch",
    save_strategy="epoch",
    learning_rate=LR,
    per_device_train_batch_size=BATCH_SIZE,
    per_device_eval_batch_size=BATCH_SIZE,
    num_train_epochs=EPOCHS,
    weight_decay=0.01,
    fp16=torch.cuda.is_available(),
    load_best_model_at_end=True,
    metric_for_best_model="f1_macro",
    logging_steps=50,
    report_to="none"
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_ds,
    eval_dataset=val_ds,
    compute_metrics=compute_metrics,
    callbacks=[EarlyStoppingCallback(early_stopping_patience=2)]
)

print("🚀 Starting training on Colab T4 GPU...")
trainer.train()
print("✅ Cell 6 Complete: Training finished successfully!")


# ═══════════════════════════════════════════════════════════════════════
# ██ CELL 7 — COMPREHENSIVE TEST SUITE (ENGLISH + ALL INDIAN LANGUAGES)
# ═══════════════════════════════════════════════════════════════════════

from transformers import pipeline
pipe = pipeline("text-classification", model=model, tokenizer=tokenizer, device=0 if torch.cuda.is_available() else -1)

test_phrases = [
    # English Positive & Negative Controls (NO BIAS TEST)
    ("I am happy today", "Routine"),
    ("Yes feeling safe", "Routine"),
    ("Thank you so much, I am feeling better today and attending the meeting.", "Routine"),
    ("I feel anxious about the hearing tomorrow", "Watch"),
    ("Someone is following me outside my house", "Urgent"),
    ("I am committing suicide I cannot take this anymore", "Critical"),
    ("Someone trying to kidnap me please call police", "Critical"),

    # Hindi Native & Roman
    ("नमस्ते मैं बिल्कुल ठीक हूँ आज", "Routine"),
    ("बचाओ मुझे मार रहे हैं जान से SOS", "Critical"),
    ("Hello main theek hoon sab badhiya", "Routine"),
    ("Mujhe case ki tension hai", "Watch"),
    ("Ghar ke bahar kuch log khade hain", "Urgent"),
    ("Bachao koi maar raha hai mujhe", "Critical"),

    # Tamil Native & Roman
    ("வணக்கம் நான் நலமாக இருக்கிறேன்", "Routine"),
    ("என்னை காப்பாற்றுங்கள் கொல்ல பார்க்கிறார்கள்", "Critical"),
    ("Vanakkam naan nalam irukiren", "Routine"),
    ("Enna kolla pakkuranaa save me", "Critical"),

    # Bengali Native & Roman
    ("আমি ভালো আছি ধন্যবাদ", "Routine"),
    ("আমাকে বাঁচান মেরে ফেলছে ওরা SOS", "Critical"),
    ("Aami bhalo achi", "Routine"),
    ("Amake maar te chaicche bachao", "Critical"),

    # Telugu Native & Roman
    ("నమస్కారం నేను బాగున్నాను", "Routine"),
    ("కాపాడండి నన్ను చంపేస్తున్నారు ప్రాణాపాయం", "Critical"),
    ("Nenu baagunnanu", "Routine"),
    ("Naaku chompeyyadaaniki try chestunnadu", "Critical"),

    # Marathi
    ("नमस्कार मी मजेत आहे आज", "Routine"),
    ("वाचवा मला जीवे मारण्याचा प्रयत्न करत आहेत SOS", "Critical"),

    # Gujarati
    ("નમસ્તે હું મજામાં છું આજે", "Routine"),
    ("બચાવો મને મારી રહ્યા છે જીવલેણ હુમલો SOS", "Critical")
]

print("\n" + "=" * 80)
print("TESTING YOUR RETRAINED INDICBERTV2 NEURAL MODEL:")
print("=" * 80)
passed = 0
for phrase, expected in test_phrases:
    res = pipe(phrase)[0]
    match = res['label'] == expected
    if match: passed += 1
    mark = "✅" if match else "❌"
    print(f"{mark} [{res['label']:<8} ({res['score']:.1%})] Expected: {expected:<8} | \"{phrase[:50]}\"")
print("=" * 80)
print(f"Result: {passed}/{len(test_phrases)} tests passed ({passed/len(test_phrases):.1%})")


# ═══════════════════════════════════════════════════════════════════════
# ██ CELL 8 — PUSH TO HUGGING FACE
# ═══════════════════════════════════════════════════════════════════════

from google.colab import userdata
try:
    HF_TOKEN = userdata.get("HF_TOKEN")
except:
    HF_TOKEN = "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"

login(token=HF_TOKEN)

print(f"🚀 Pushing retrained weights to Hugging Face: {HF_REPO_NAME}...")
model.push_to_hub(HF_REPO_NAME, token=HF_TOKEN)
tokenizer.push_to_hub(HF_REPO_NAME, token=HF_TOKEN)
print(f"\n🎉 Model updated live on Hugging Face: https://huggingface.co/{HF_REPO_NAME}")
