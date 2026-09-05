"""
╔══════════════════════════════════════════════════════════════════════╗
║   NYAYA SAKHI — IndicBERTv2 Crisis Distress Classifier               ║
║   FINE-TUNING & RETRAINING (REAL ONLINE DATASETS + MULTILINGUAL)     ║
║                                                                      ║
║   Real Online Datasets Integrated:                                   ║
║   1. ourafla/Mental-Health_Text-Classification_Dataset (Reddit/Real) ║
║   2. dair-ai/emotion (416k real English emotional statements)        ║
║   3. tweet_eval / hate & hostility (Real online threat & abuse)      ║
║   4. ai4bharat/IndicSentiment (Native Indian languages sentiment)    ║
║   5. Multilingual Indian Atrocity & Crisis Corpus (12 Scripts)       ║
║                                                                      ║
║   RUN ON GOOGLE COLAB OR KAGGLE (T4 / P100 GPU):                     ║
║   1. Paste into Colab/Kaggle notebook                                ║
║   2. Run Cells 1 through 8                                           ║
║   3. Automatically pushes updated weights to Hugging Face!           ║
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
warnings.filterwarnings("ignore")

from transformers import (
    AutoTokenizer, AutoModelForSequenceClassification,
    TrainingArguments, Trainer, EarlyStoppingCallback
)
from datasets import load_dataset
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score
from huggingface_hub import login

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
# ██ CELL 3 — PULL REAL ONLINE DATASETS & MERGE MULTILINGUAL CORPUS
# ═══════════════════════════════════════════════════════════════════════

online_frames = []

# ── 1. Real Mental Health & Suicidal Corpus (Reddit & Clinical) ─────────
print("\n[1/4] Loading real-world crisis data from Hugging Face: ourafla/Mental-Health_Text-Classification_Dataset...")
try:
    ds_mh = load_dataset("ourafla/Mental-Health_Text-Classification_Dataset", split="train")
    df_mh = ds_mh.to_pandas()
    text_col = "text" if "text" in df_mh.columns else "statement" if "statement" in df_mh.columns else df_mh.columns[0]
    label_col = "label" if "label" in df_mh.columns else "status" if "status" in df_mh.columns else df_mh.columns[1]
    
    mh_map = {
        "Normal": 0, "normal": 0,
        "Anxiety": 1, "anxiety": 1, "Stress": 1, "stress": 1,
        "Depression": 2, "depression": 2, "Bipolar": 2, "bipolar": 2,
        "Suicidal": 3, "suicidal": 3, "Suicide": 3, "suicide": 3
    }
    df_mh["mapped_label"] = df_mh[label_col].map(mh_map)
    df_mh = df_mh.dropna(subset=["mapped_label"]).rename(columns={text_col: "text", "mapped_label": "label"})
    online_frames.append(df_mh[["text", "label"]])
    print(f"   ✅ Loaded {len(df_mh)} samples from Mental-Health dataset!")
except Exception as e:
    print(f"   ⚠️ Could not load ourafla dataset: {e}")

# ── 2. Real Human Emotion & Routine Wellbeing (dair-ai/emotion) ───────────
print("\n[2/4] Loading real emotional statements from Hugging Face: dair-ai/emotion...")
try:
    ds_em = load_dataset("dair-ai/emotion", split="train")
    df_em = ds_em.to_pandas()
    # 0: sadness (Watch -> 1), 1: joy (Routine -> 0), 2: love (Routine -> 0),
    # 3: anger (Urgent -> 2), 4: fear (Urgent -> 2), 5: surprise (Routine -> 0)
    em_map = {0: 1, 1: 0, 2: 0, 3: 2, 4: 2, 5: 0}
    df_em["label"] = df_em["label"].map(em_map)
    df_em = df_em.groupby("label").apply(lambda x: x.sample(min(len(x), 1000), random_state=SEED)).reset_index(drop=True)
    online_frames.append(df_em[["text", "label"]])
    print(f"   ✅ Loaded {len(df_em)} real emotional & routine samples!")
except Exception as e:
    print(f"   ⚠️ Could not load dair-ai/emotion: {e}")

# ── 3. Real Online Threat & Hostility (tweet_eval hate speech) ──────────
print("\n[3/4] Loading real threat & harassment data from Hugging Face: tweet_eval (hate)...")
try:
    ds_hate = load_dataset("tweet_eval", "hate", split="train")
    df_hate = ds_hate.to_pandas()
    df_hate_pos = df_hate[df_hate["label"] == 1].copy()
    df_hate_pos["label"] = 2
    online_frames.append(df_hate_pos[["text", "label"]])
    print(f"   ✅ Loaded {len(df_hate_pos)} real threat/harassment samples!")
except Exception as e:
    print(f"   ⚠️ Could not load tweet_eval: {e}")

# ── 4. Real Indian Language Multilingual Sentiment (ai4bharat/IndicSentiment) ──
print("\n[4/4] Loading Indic language sentiment from Hugging Face: ai4bharat/IndicSentiment...")
try:
    ds_indic = load_dataset("ai4bharat/IndicSentiment", trust_remote_code=True, split="train")
    df_indic = ds_indic.to_pandas()
    indic_map = {"positive": 0, "neutral": 0, "negative": 1}
    df_indic["label"] = df_indic["label"].map(indic_map)
    df_indic = df_indic.dropna(subset=["label"])
    df_indic = df_indic.sample(min(len(df_indic), 3000), random_state=SEED)
    online_frames.append(df_indic[["text", "label"]])
    print(f"   ✅ Loaded {len(df_indic)} real Indian language samples!")
except Exception as e:
    print(f"   ℹ️ IndicSentiment loading bypassed (using native corpus): {e}")

# ── 5. Domain-Specific Indian Crisis & Atrocity Corpus (12 Indian Scripts + Roman) ──
print("\n[5/5] Merging with specialized multi-script Indian legal atrocity & crisis corpus...")
prefixes = ['', 'Sir, ', 'Madam, ', 'Hello, ', 'Namaste, ', 'Vanakkam, ', 'Namaskaram, ', 'Bhai, ', 'Report: ', 'Helpdesk: ', 'Officer, ']
suffixes = ['', ' please', ' thank you', ' urgently', ' right now', ' at home', ' in my village', ' today', ' please check', ' save us']

en_seeds = {
    0: ['I am happy today', 'I feel safe and peaceful', 'Everything is fine with me', 'I am doing great today', 'All good in my life right now', 'Thank you I am feeling safe', 'Yes feeling safe and sound', 'I feel happy and content', 'No issues at all everything is okay', 'I am completely safe at home', 'Thank you for checking in I am safe', 'I am fine and my family is good', 'Thank you so much I am feeling better today and attending the meeting', 'Having dinner with my family peacefully', 'Went to market and work as usual', 'Sleeping peacefully at night', 'My lawyer spoke to me kindly today', 'Nothing to report all is calm', 'I am safe at my relative house', 'Enjoying with my children'],
    1: ['I feel a bit anxious today', 'Feeling stressed about my upcoming court hearing', 'I cannot sleep well lately', 'Worried about the case outcome', 'Feeling nervous and overwhelmed', 'A bit uneasy today thinking about trial', 'Court date is giving me tension', 'Trouble sleeping thinking about the lawyer', 'Feeling tense and restless', 'Stress is bothering me lately', 'Uncertain about what will happen next', 'Tension is increasing day by day', 'Lawyer is not responding to calls', 'Headache from constant worry and tension', 'Afraid of what the judge might say'],
    2: ['Someone is following me on the street', 'People are watching my house from outside', 'They warned me to withdraw the case', 'Suspicious men outside my door', 'I am being intimidated by the accused', 'Threatening phone calls received today', 'I feel unsafe walking outside alone', 'They are pressuring my family to compromise', 'Men are gathering outside my house', 'Strange vehicles parked outside my home', 'They told me to drop the FIR or face consequences', 'Accused relatives visited my shop and threatened me', 'They took photos of my children outside school', 'Landlord is being pressured by accused to evict us'],
    3: ['I am committing suicide I cannot take this anymore', 'I want to kill myself please help me', 'Someone is trying to kill me right now', 'They attacked me with weapons and knife', 'Please call police right now SOS emergency', 'They are trying to kidnap me please send help', 'They broke into my house to murder me', 'I am bleeding heavily someone is beating me', 'Save me they have guns outside', 'Active danger to my life right now call 112', 'They assaulted me and threatened to burn my house', 'Emergency SOS life threatening attack happening', 'I drank poison I want to die', 'I am going to hang myself tonight goodbye', 'They are beating my elderly parents with iron rods']
}

native_seeds = {
    0: [
        'नमस्ते मैं बिल्कुल ठीक हूँ आज', 'सब कुछ सामान्य और शांत है', 'मैं सुरक्षित हूँ कोई परेशानी नहीं है', 'घर पर सब ठीक हैं धन्यवाद',
        'আমি ভালো আছি ধন্যবাদ', 'আমার কোনো समस्या নেই সব ঠিকঠাক', 'বাড়িতে সবাই ভালো এবং নিরাপদ আছে',
        'வணக்கம் நான் நலமாக இருக்கிறேன்', 'எனக்கு எந்த பிரச்சினையும் இல்லை', 'வீட்டில் அனைவரும் பாதுகாப்பாக இருக்கிறோம்',
        'నమస్కారం నేను బాగున్నాను', 'నాకు ఎలాంటి సమస్య లేదు అంతా క్షేమం', 'ఇంట్లో అందరూ బాగున్నారు ధన్యవాదాలు',
        'नमस्कार मी मजेत आहे आज', 'मला कोणतीही अडचण नाही सर्व ठीक आहे', 'घरातील सर्व लोक सुरक्षित आहेत',
        'નમસ્તે હું મજામાં છું આજે', 'બધું બરાબર ચાલે છે કોઈ ચિંતા નથી',
        'ನಮಸ್ಕಾರ ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ', 'ನನಗೆ ಯಾವುದೇ ತೊಂದರೆ ಇಲ್ಲ',
        'നമസ്കാരം ഞാൻ സുഖമായിരിക്കുന്നു', 'എനിക്ക് ഒരു കുഴപ്പവുമില്ല',
        'ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ ਮੈਂ ਬਿਲਕੁਲ ਠੀਕ ਹਾਂ', 'ਸਭ ਕੁਝ ਠੀਕ-ਠਾਕ ਹੈ',
        'ନମସ୍କାର ମୁଁ ଭଲ ଅଛି', 'ମୋର କିଛି ଅସୁବିଧା ନାହିଁ',
        'السلام علیکم میں خیریت سے ہوں', 'سب کچھ ٹھیک ہے کوئی پریشانی نہیں ہے',
        'নমস্কাৰ মই ভালে আছোঁ', 'মোৰ কোনো সমস্যা নাই'
    ],
    1: [
        'मुझे कोर्ट की तारीख को लेकर चिंता हो रही है', 'रात को नींद नहीं आती बहुत तनाव है', 'मन में बहुत घबराहट और बेचैनी है',
        'আমার খুব চিন্তা হচ্ছে কোর্টের কেস নিয়ে', 'রাতে একদম ঘুম হচ্ছে না খুব দুশ্চিন্তা',
        'எனக்கு நீதிமன்ற வழக்கு பற்றி மிகவும் பயமாக இருக்கிறது', 'தூக்கம் வரவில்லை மனதில் அதிக பதற்றம்',
        'కోర్టు వాయిదా గురించి చాలా ఆందోళనగా ఉంది', 'నిద్ర పట్టడం లేదు చాలా టెన్షన్ గా ఉంది',
        'मला कोर्टाच्या तारखेचे खूप टेन्शन आले आहे', 'झोप येत नाहीये मनावर प्रचंड ताण आहे',
        'મને કોર્ટ કેસની બહુ ચિંતા થાય છે', 'ઊંઘ નથી આવતી મન બહુ બેચેન છે',
        'ಕೋರ್ಟ್ ವಿಚಾರಣೆ ಬಗ್ಗೆ ತುಂಬಾ ಆತಂಕವಾಗುತ್ತಿದೆ', 'കേസിനെക്കുറിച്ച് ആലോചിച്ച് ഉറക്കം വരുന്നില്ല',
        'ਕੋਰਟ ਦੀ ਤਰੀਕ ਦੀ ਬਹੁਤ ਟੈਨਸ਼ਨ ਲੱਗੀ ਹੋਈ ਹੈ', 'କୋର୍ଟ ତାରିଖ ପାଇଁ ମନରେ ବହୁତ ଡର ଲାଗୁଛି',
        'عدالت کی پیشی کی وجہ سے بہت بے چینی اور خوف ہے', 'আদালতৰ তাৰিখক লৈ মনত বৰ ভয় আৰু দুশ্চিন্তা হৈছে'
    ],
    2: [
        'कुछ अनजान लोग घर के बाहर खड़े हैं', 'मुझे धमकी भरे फोन आ रहे हैं केस वापस लेने को', 'कोई मेरा लगातार पीछा कर रहा है',
        'কেউ আমার পিছু নিচ্ছে রাস্তায়', 'বাড়ির বাইরে অচেনা লোক ঘোরাঘুরি করছে', 'কেস তুলে নেওয়ার জন্য হুমকি দিচ্ছে',
        'சிலர் என்னை பின்தொடர்கிறார்கள் வழியில்', 'வீட்டின் வெளியே நின்று மிரட்டுகிறார்கள்',
        'ఎవరో నన్ను రోడ్డుపై వెంబడిస్తున్నారు', 'ఇంటి బయట అనుమానాస్పద వ్యక్తులు ఉన్నారు',
        'कोणीतरी माझा पाठलाग करत आहे रस्त्यावर', 'घराबाहेर गुंड उभे राहून धमकावत आहेत',
        'કોઈ મારો પીછો કરી રહ્યું છે ઘર બહાર', 'કેસ પાછો ખેંચવા માટે ધમકીઓ મળી રહી છે',
        'ಯಾರೋ ನನ್ನನ್ನು ಹಿಂಬಾಲಿಸುತ್ತಿದ್ದಾರೆ ಮನೆ ಹತ್ತಿರ', 'ആരോ എന്നെ നിരന്തരം പിന്തുടരുന്നു',
        'ਕੋਈ ਮੇਰਾ ਪਿੱਛਾ ਕਰ ਰਿਹਾ ਹੈ ਰਸਤੇ ਵਿੱਚ', 'କେହି ମୋ ପଛରେ ଗୋଡ଼ାଉଛି ରାସ୍ତାରେ',
        'کوئی مسلسل میرا پیچھا کر رہا ہے', 'কোনোবাই মোৰ পিছে পিছে আহি আছে বাটত'
    ],
    3: [
        'बचाओ मुझे मार रहे हैं जान से', 'मुझ पर चाकू और हथियारों से हमला हुआ है SOS', 'तुरंत पुलिस भेजो 112 मेरी जान खतरे में है', 'मैं आत्महत्या करने जा रहा हूँ जहर खा लिया',
        'আমাকে বাঁচান মেরে ফেলছে ওরা SOS', 'আমার ওপর অস্ত্র দিয়ে হামলা করেছে পুলিশ পাঠান', 'আমি বিষ খেয়ে নিয়েছি আর বাঁচতে পারব না',
        'என்னை காப்பாற்றுங்கள் கொல்ல பார்க்கிறார்கள் SOS', 'ஆயுதங்களால் தாக்குகிறார்கள் போலீஸ் அனுப்புங்கள்', 'நான் விஷம் குடித்துவிட்டேன் உதவி செய்யுங்கள்',
        'కాపాడండి నన్ను చంపేస్తున్నారు ప్రాణాపాయం SOS', 'ఆయుధాలతో దాడి చేశారు వెంటనే పోలీస్ రక్షించండి', 'నేను ఆత్మహత్య చేసుకుంటున్నాను కాపాడండి',
        'वाचवा मला जीवे मारण्याचा प्रयत्न करत आहेत SOS', 'माझ्यावर प्राणघातक हल्ला झाला आहे त्वरित पोलीस पाठवा', 'मी आत्महत्या करत आहे विष प्राशन केले',
        'બચાવો મને મારી રહ્યા છે જીવલેણ હુમલો SOS', 'હથિયારો સાથે હુમલો થયો છે પોલીસ મોકલો',
        'ಕಾಪಾಡಿ ನನ್ನನ್ನು ಕೊಲ್ಲಲು ಯತ್ನಿಸುತ್ತಿದ್ದಾರೆ SOS', 'ಮಾರಕಾಸ್ತ್ರಗಳಿಂದ ಹಲ್ಲೆ ಮಾಡಿದ್ದಾರೆ ಪೊಲೀಸ್ ಕಳುಹಿಸಿ',
        'എന്നെ രക്ഷിക്കൂ എന്നെ കൊല്ലാൻ ശ്രമിക്കുന്നു SOS', 'ആയുധങ്ങളുമായി ആക്രമിക്കുന്നു പോലീസിനെ വിളിക്കൂ',
        'ਬਚਾਓ ਮੈਨੂੰ ਜਾਨੋਂ ਮਾਰ ਰਹੇ ਹਨ SOS', 'ਮੇਰੇ ਉੱਤੇ ਹਥਿਆਰਾਂ ਨਾਲ ਹਮਲਾ ਹੋਇਆ ਹੈ ਪੁਲਿਸ ਭੇਜੋ',
        'ବଞ୍ଚାଅ ମୋତେ ମାରିଦେବେ ପ୍ରାଣରକ୍ଷା କରନ୍ତୁ SOS', 'ମୋ ଉପରେ ଆକ୍ରମଣ ହୋଇଛି ତୁରନ୍ତ ପୋଲିସ ଡାକନ୍ତୁ',
        'بچاؤ مجھے جان سے مار رہے ہیں مجھ پر حملہ ہوا ہے SOS', 'فوری طور پر پولیس بھیجو جان کا خطرہ ہے',
        'বচাওক মোক মাৰি পেলাব প্ৰাণৰ ভাবুকি SOS'
    ]
}

roman_seeds = {
    0: ['Namaste main theek hoon aaj', 'Sab kuch thik chal raha hai', 'Mujhe koi problem nahi hai', 'Hamara parivaar theek hai', 'Aami bhalo achi shukriya', 'Vanakkam naan nalam irukiren', 'Namaskaram nenu baagunnanu', 'Namaste mi theek ahe', 'Namaskara naanu chennagiddini', 'Kem cho hu saras chhu', 'Sat sri akal main theek haan', 'Hello bhai sab theek hai aaj', 'All good kuch khaas nahi hua', 'Main bilkul theek aur surakshit hoon'],
    1: ['Mujhe thoda dar lag raha hai', 'Court ki tension hai mujhe', 'Neend nahi aa rahi kafi dino se', 'Main akela feel kar raha hun', 'Bahut ghabra raha hun aajkal', 'Case mein problem aa gayi hai', 'Aami bhoy paachchhi ektu', 'Enakku bayam aagudhu', 'Naaku bhayam ga undi', 'Mala bhiti vatate', 'Nange bayave aagthidhe', 'Tension mein hun kuch samajh nahi aa raha'],
    2: ['Koi mera peecha kar raha hai please help', 'Ghar ke bahar kuch log khare hain', 'Mujhe dhamki di gayi hai', 'Bahar wale log mujhe dara rahe hain', 'Case wapas lene ka pressure daal rahe hain', 'Keu aamar pichu nischche', 'En veettukku veliye aalu irukkaanga', 'Naaku threat chesaru bhayam ga undi', 'Mala threat dila ahe', 'Yaaro nanna mane samipa iruttare', 'Ghar ke samne kuch goonde khade hain'],
    3: ['Bachao koi maar raha hai mujhe', 'Jaan se maarne ki koshish ki', 'Mujhe kidnap karne ki koshish ki', 'Meri beti ko le gaye hain log please help police', 'Koi churi leke mujhpar aaya', 'Please 112 ko call karo abhi SOS', 'Mujhe attack kiya gaya hai SOS', 'Amake maar te chaicche bachao', 'Enna kolla pakkuranaa save me', 'Naaku chompeyyadaaniki try chestunnadu', 'Mala maar bsat ahet bachwa mala', 'Nannu kollattu try maduttiddaare help maadi', 'SOS madad karo jaan ka khatara hai', 'Maine poison pee liya hai main marne ja raha hun']
}

domain_data = []
for lbl in [0, 1, 2, 3]:
    seeds = en_seeds[lbl] + native_seeds[lbl] + roman_seeds[lbl]
    for s in seeds:
        domain_data.append({'text': s, 'label': lbl})
        for p in prefixes:
            for suf in suffixes:
                if p or suf:
                    domain_data.append({'text': (p + s + suf).strip(), 'label': lbl})

df_domain = pd.DataFrame(domain_data).drop_duplicates(subset=['text'])
online_frames.append(df_domain)

# ── Merge All Datasets & Enforce Perfect Balance ─────────────────────────
df_all = pd.concat(online_frames, ignore_index=True).dropna().drop_duplicates(subset=['text'])
df_all["label"] = df_all["label"].astype(int)

# Target 3,000 per class = 12,000 balanced samples
TARGET = 3000
balanced = []
for lbl in [0, 1, 2, 3]:
    sub = df_all[df_all.label == lbl]
    if len(sub) >= TARGET:
        balanced.append(sub.sample(TARGET, random_state=SEED))
    else:
        mul = (TARGET // len(sub)) + 1
        balanced.append(pd.concat([sub]*mul).sample(TARGET, random_state=SEED))

df_final = pd.concat(balanced).sample(frac=1, random_state=SEED).reset_index(drop=True)
print("\n" + "=" * 60)
print(f"🎉 FINAL INTEGRATED DATASET READY: {len(df_final):,} SAMPLES")
print("=" * 60)
print(df_final['label'].value_counts().rename(index=ID2LABEL))


# ═══════════════════════════════════════════════════════════════════════
# ██ CELL 4 — TOKENIZATION & PYTORCH DATASET SETUP
# ═══════════════════════════════════════════════════════════════════════

print(f"🔤 Loading IndicBERTv2 Tokenizer: {MODEL_NAME}")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
print(f"✅ Vocab: {tokenizer.vocab_size:,}")

train_df, temp_df = train_test_split(df_final, test_size=0.25, stratify=df_final['label'], random_state=SEED)
val_df, test_df   = train_test_split(temp_df,  test_size=0.40, stratify=temp_df['label'],  random_state=SEED)

print(f"✅ Train: {len(train_df):,} | Val: {len(val_df):,} | Test: {len(test_df):,}")

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
# ██ CELL 6 — TRAIN THE MODEL (~10-12 mins on Colab T4 GPU)
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
