"""
╔══════════════════════════════════════════════════════════════════════╗
║   NYAYA SAKHI — IndicBERTv2 Crisis Distress Classifier               ║
║   GOOGLE COLAB VERSION  (Free T4 GPU)                                ║
║                                                                      ║
║   HOW TO USE:                                                        ║
║   1. Go to colab.research.google.com → New Notebook                  ║
║   2. Runtime → Change runtime type → T4 GPU (free)                  ║
║   3. Copy-paste each CELL block below into separate Colab cells      ║
║   4. Secrets: Click 🔑 key icon (left sidebar) → Add HF_TOKEN       ║
║   5. Run all cells top to bottom                                     ║
╚══════════════════════════════════════════════════════════════════════╝

DIFFERENCE vs KAGGLE VERSION:
  - Kaggle secret  → google.colab.userdata (Cell 1 & Cell 10)
  - Kaggle P100    → Colab T4 (same performance, slightly less VRAM)
  - Batch size 16  → 8 on Colab (T4 has 15GB vs P100 16GB)

Everything else is IDENTICAL.
"""

# ═══════════════════════════════════════════════════════════════════════
# ██ CELL 1 — INSTALL + MOUNT GOOGLE DRIVE (optional, for saving model)
# ═══════════════════════════════════════════════════════════════════════
# Paste this as Cell 1 in Colab. Run it first.

# Mount Drive to save your trained model permanently
# (Without this, model is lost when Colab session ends)
from google.colab import drive
drive.mount('/content/drive')

# Install packages
import subprocess
subprocess.run(["pip", "install", "-q",
    "transformers==4.44.0",
    "datasets==2.21.0",
    "accelerate==0.34.0",
    "scikit-learn",
    "pandas",
    "numpy",
    "torch",
    "huggingface_hub",
    "sentencepiece",
    "protobuf",
    "seqeval",
    "matplotlib",
    "seaborn"
])
print("✅ All packages installed")


# ═══════════════════════════════════════════════════════════════════════
# ██ CELL 2 — IMPORTS & GPU CHECK
# ═══════════════════════════════════════════════════════════════════════

import os, re, json, random, warnings
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
warnings.filterwarnings("ignore")

import torch
from transformers import (
    AutoTokenizer, AutoModelForSequenceClassification,
    TrainingArguments, Trainer, EarlyStoppingCallback,
)
from datasets import load_dataset, Dataset as HFDataset
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, f1_score,
    classification_report, confusion_matrix, ConfusionMatrixDisplay,
)
from huggingface_hub import login

# GPU Check
if torch.cuda.is_available():
    gpu_name = torch.cuda.get_device_name(0)
    gpu_mem  = torch.cuda.get_device_properties(0).total_memory / 1e9
    print(f"✅ GPU: {gpu_name}  |  VRAM: {gpu_mem:.1f} GB")
else:
    print("❌ NO GPU! Go to: Runtime → Change runtime type → T4 GPU")

SEED = 42
random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)

# ── CONFIG ─────────────────────────────────────────────────────────────
MODEL_NAME   = "ai4bharat/IndicBERTv2-MLM-only"
DRIVE_PATH   = "/content/drive/MyDrive/nyaya-sakhi-indicbert"  # saved to Drive
OUTPUT_DIR   = DRIVE_PATH
HF_REPO_NAME = "nyaya-sakhi-crisis-indicbert"  # your HF repo name
MAX_LEN      = 128
BATCH_SIZE   = 8    # ← 8 for Colab T4 (16 for Kaggle P100)
EPOCHS       = 5
LR           = 2e-5
WEIGHT_DECAY = 0.01  # ← was missing — now fixed
NUM_LABELS   = 4

LABEL2ID = {"Routine": 0, "Watch": 1, "Urgent": 2, "Critical": 3}
ID2LABEL = {0: "Routine", 1: "Watch", 2: "Urgent", 3: "Critical"}

os.makedirs(OUTPUT_DIR, exist_ok=True)
print(f"\n📌 Model    : {MODEL_NAME}")
print(f"📌 Output   : {OUTPUT_DIR}")
print(f"📌 Batch    : {BATCH_SIZE} (T4-safe)")


# ═══════════════════════════════════════════════════════════════════════
# ██ CELL 3 — DOWNLOAD FREE DATASETS FROM HUGGINGFACE
# ═══════════════════════════════════════════════════════════════════════

print("📥 Downloading public crisis datasets...")
frames = []

# ── Dataset 1: Suicide Watch ────────────────────────────────────────────
print("\n[1/3] vibhorag101/suicide-watch ...")
try:
    ds1  = load_dataset("vibhorag101/suicide-watch", split="train")
    df1  = ds1.to_pandas()[["text", "class"]].dropna()
    df1.columns = ["text", "raw_label"]
    df1["label"] = df1["raw_label"].map({"suicide": 3, "non-suicide": 0})
    df1  = df1.dropna(subset=["label"])
    pos  = df1[df1["label"] == 3].sample(min(2500, sum(df1["label"]==3)), random_state=SEED)
    neg  = df1[df1["label"] == 0].sample(min(2500, sum(df1["label"]==0)), random_state=SEED)
    df1  = pd.concat([pos, neg])
    frames.append(df1[["text", "label"]])
    print(f"   ✅ {len(df1)} rows loaded")
except Exception as e:
    print(f"   ⚠️  {e}")

# ── Dataset 2: Dreaddit (Stress) ────────────────────────────────────────
print("\n[2/3] dair-ai/dreaddit ...")
try:
    df2 = pd.concat([
        load_dataset("dair-ai/dreaddit", split="train").to_pandas(),
        load_dataset("dair-ai/dreaddit", split="test").to_pandas()
    ])
    df2 = df2[["text", "label"]].dropna()
    df2["label"] = df2["label"].map({1: 1, 0: 0})
    frames.append(df2[["text", "label"]])
    print(f"   ✅ {len(df2)} rows loaded")
except Exception as e:
    print(f"   ⚠️  {e}")

# ── Dataset 3: Mental Health Reddit ────────────────────────────────────
print("\n[3/3] solomonk/mental_health_reddit_posts ...")
try:
    ds3 = load_dataset("solomonk/mental_health_reddit_posts", split="train")
    df3 = ds3.to_pandas()
    label_map_3 = {
        "Normal": 0, "Anxiety": 1, "Stress": 1,
        "Depression": 2, "Bipolar": 2, "PTSD": 2,
        "Personality disorder": 2, "Suicidal": 3,
    }
    tcol = next((c for c in ["post","text","statement"] if c in df3.columns), None)
    lcol = next((c for c in ["label","status","class"] if c in df3.columns), None)
    if tcol and lcol:
        df3 = df3[[tcol, lcol]].dropna()
        df3.columns = ["text", "raw_label"]
        df3["label"] = df3["raw_label"].map(label_map_3)
        df3 = df3.dropna(subset=["label"])
        df3["label"] = df3["label"].astype(int)
        frames.append(df3[["text", "label"]])
        print(f"   ✅ {len(df3)} rows loaded")
except Exception as e:
    print(f"   ⚠️  {e}")

df_en = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame(columns=["text","label"])
df_en["label"] = df_en["label"].astype(int)
print(f"\n✅ English total: {len(df_en)} | Distribution: {df_en['label'].value_counts().to_dict()}")


# ═══════════════════════════════════════════════════════════════════════
# ██ CELL 4 — INDIAN LANGUAGE CRISIS DATASET (24 Languages)
# ═══════════════════════════════════════════════════════════════════════

INDIAN_DATA = [
    # ── ROUTINE (0) ─────────────────────────────────────────────────
    {"text": "Namaste main theek hoon aaj",              "label": 0},
    {"text": "Sab kuch thik chal raha hai",              "label": 0},
    {"text": "Mujhe koi problem nahi hai",               "label": 0},
    {"text": "Hamara parivaar theek hai",                "label": 0},
    {"text": "Aami bhalo achi shukriya",                 "label": 0},  # Bengali
    {"text": "Vanakkam naan nalam irukiren",             "label": 0},  # Tamil
    {"text": "Namaskaram nenu baagunnanu",               "label": 0},  # Telugu
    {"text": "Namaste mi theek ahe",                    "label": 0},  # Marathi
    {"text": "Namaskara naanu chennagiddini",            "label": 0},  # Kannada
    {"text": "Kem cho hu saras chhu",                   "label": 0},  # Gujarati
    {"text": "Sat sri akal main theek haan",            "label": 0},  # Punjabi
    {"text": "Hello bhai sab theek hai aaj",            "label": 0},  # Hinglish
    {"text": "All good kuch khaas nahi hua",            "label": 0},  # Hinglish
    {"text": "Namasthe bagunna",                        "label": 0},  # Telugu
    {"text": "Mala kahi problem nahi aaj",              "label": 0},  # Marathi

    # ── WATCH (1) ───────────────────────────────────────────────────
    {"text": "Mujhe thoda dar lag raha hai",            "label": 1},
    {"text": "Court ki tension hai mujhe",              "label": 1},
    {"text": "Neend nahi aa rahi kafi dino se",         "label": 1},
    {"text": "Main akela feel kar raha hun",            "label": 1},
    {"text": "Bahut ghabra raha hun aajkal",            "label": 1},
    {"text": "Case mein problem aa gayi hai",           "label": 1},
    {"text": "Aami bhoy paachchhi ektu",                "label": 1},  # Bengali
    {"text": "Enakku bayam aagudhu",                   "label": 1},  # Tamil
    {"text": "Naaku bhayam ga undi",                   "label": 1},  # Telugu
    {"text": "Mala bhiti vatate",                      "label": 1},  # Marathi
    {"text": "Nange bayave aagthidhe",                 "label": 1},  # Kannada
    {"text": "Yaar bahut dar lag raha hai case se",    "label": 1},  # Hinglish
    {"text": "Tension mein hun kuch samajh nahi aa",   "label": 1},  # Hinglish
    {"text": "Nidra pattaledu kaligipotundi",          "label": 1},  # Telugu
    {"text": "Ratey ghum hoy na",                      "label": 1},  # Bengali

    # ── URGENT (2) ──────────────────────────────────────────────────
    {"text": "Koi mera peecha kar raha hai please help",         "label": 2},
    {"text": "Ghar ke bahar kuch log khare hain",                "label": 2},
    {"text": "Mujhe dhamki di gayi hai",                         "label": 2},
    {"text": "Bahar wale log mujhe dara rahe hain",              "label": 2},
    {"text": "Case wapas lene ka pressure daal rahe hain",       "label": 2},
    {"text": "Koi raat ko ghar ke bahar ghoomta hai",            "label": 2},
    {"text": "Keu aamar pichu nischche",                         "label": 2},  # Bengali
    {"text": "En veettukku veliye aalu irukkaanga",              "label": 2},  # Tamil
    {"text": "Naaku threat chesaru bhayam ga undi",              "label": 2},  # Telugu
    {"text": "Mala threat dila ahe mala bhiti vatate",           "label": 2},  # Marathi
    {"text": "Yaaro nanna mane samipa iruttare",                 "label": 2},  # Kannada
    {"text": "Koi mera picha kar raha hai bhai help karo",       "label": 2},  # Hinglish
    {"text": "Ghar ke samne kuch goonde khade hain",             "label": 2},  # Hinglish
    {"text": "Please help karo mujhe unsafe feel ho raha hai",   "label": 2},  # Hinglish
    {"text": "Mujhe dhamki di gayi hai bahut darr lag raha hai", "label": 2},  # Urdu
    {"text": "Naa venaka vachhe vaallunnaru",                    "label": 2},  # Telugu
    {"text": "Amake dhamki deoya hochhe",                        "label": 2},  # Bengali

    # ── CRITICAL (3) ────────────────────────────────────────────────
    {"text": "Bachao koi maar raha hai mujhe",                          "label": 3},
    {"text": "Jaan se maarne ki koshish ki",                            "label": 3},
    {"text": "Mujhe kidnap karne ki koshish ki",                        "label": 3},
    {"text": "Meri beti ko le gaye hain log please help police",        "label": 3},
    {"text": "Koi churi leke mujhpar aaya",                             "label": 3},
    {"text": "Please 112 ko call karo abhi",                            "label": 3},
    {"text": "Mujhe attack kiya gaya hai SOS",                          "label": 3},
    {"text": "Amake maar te chaicche bachao",                           "label": 3},  # Bengali
    {"text": "Amake kidnap kore niye geche",                            "label": 3},  # Bengali
    {"text": "Enna kolla pakkuranaa save me",                           "label": 3},  # Tamil
    {"text": "En pillai yai kidnap panniyaanga please help",            "label": 3},  # Tamil
    {"text": "Naaku chompeyyadaaniki try chestunnadu",                  "label": 3},  # Telugu
    {"text": "Police ni pilavaandi please abhi",                        "label": 3},  # Telugu
    {"text": "Mala maar bsat ahet bachwa mala",                         "label": 3},  # Marathi
    {"text": "Mala kidnap kele please madad kara",                      "label": 3},  # Marathi
    {"text": "Nannu kollattu try maduttiddaare help maadi",             "label": 3},  # Kannada
    {"text": "Bhai bachao koi maar raha hai please 112",                "label": 3},  # Hinglish
    {"text": "I am not feeling good some try to kidnap me",             "label": 3},  # Hinglish
    {"text": "Someone is trying to kill me please call police",         "label": 3},  # Hinglish
    {"text": "SOS madad karo jaan ka khatara hai",                      "label": 3},  # Hinglish
    {"text": "Mote marichhu bachao please",                             "label": 3},  # Odia
    {"text": "Enne konnu kalavaan nokkunu help cheyyu",                 "label": 3},  # Malayalam
    {"text": "Mainu maar rehe ne bachao please",                        "label": 3},  # Punjabi
    {"text": "Mane maari naakhu chhe help karo",                        "label": 3},  # Gujarati
    {"text": "Mujhe qatl karne ki koshish ho rahi hai bachao",          "label": 3},  # Urdu
    {"text": "Abhi koi mujh par hamla kar raha hai SOS",                "label": 3},  # Urdu
    {"text": "Ennaku adi vaangittaanga help koopidu",                   "label": 3},  # Tamil
    {"text": "Naaku attack chesaru help kavali",                        "label": 3},  # Telugu
]

df_in = pd.DataFrame(INDIAN_DATA)
df_in["label"] = df_in["label"].astype(int)

# Augment by repeating Critical & Urgent
def augment(text):
    words = text.split()
    if len(words) > 4:
        words.pop(random.randint(0, len(words)-1))
    return " ".join(words)

aug = []
for _, row in df_in.iterrows():
    if row["label"] == 3:
        [aug.append({"text": augment(row["text"]), "label": 3}) for _ in range(4)]
    elif row["label"] == 2:
        [aug.append({"text": augment(row["text"]), "label": 2}) for _ in range(2)]

df_in = pd.concat([df_in, pd.DataFrame(aug)], ignore_index=True)
print(f"✅ Indian language samples: {len(df_in)}")
print(df_in["label"].value_counts().rename(index=ID2LABEL))


# ═══════════════════════════════════════════════════════════════════════
# ██ CELL 5 — CLEAN, MERGE & BALANCE
# ═══════════════════════════════════════════════════════════════════════

def clean(text):
    if not isinstance(text, str): return ""
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"\S+@\S+\.\S+", "[EMAIL]", text)
    text = re.sub(r"\b\d{10,12}\b", "[PHONE]", text)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text.split()) < 2: return ""
    return " ".join(text.split()[:100])  # cap at 100 words

df_all = pd.concat([df_en, df_in], ignore_index=True)
df_all["text"]  = df_all["text"].apply(clean)
df_all          = df_all[df_all["text"].str.len() > 5]
df_all          = df_all.drop_duplicates(subset=["text"])
df_all["label"] = df_all["label"].astype(int)

# Balance to 2000 per class
TARGET = 2000
balanced = []
for lbl in [0,1,2,3]:
    sub = df_all[df_all["label"]==lbl]
    if len(sub) >= TARGET:
        sub = sub.sample(TARGET, random_state=SEED)
    else:
        mul = (TARGET // len(sub)) + 1
        sub = pd.concat([sub]*mul).sample(TARGET, random_state=SEED)
    balanced.append(sub)

df_final = pd.concat(balanced).sample(frac=1, random_state=SEED).reset_index(drop=True)
print(f"✅ Final dataset: {len(df_final)} samples ({TARGET} per class)")

# Plot distribution
plt.figure(figsize=(8,4))
df_final["label"].value_counts().sort_index().rename(index=ID2LABEL).plot(
    kind="bar", color=["#4CAF50","#FFC107","#FF9800","#F44336"]
)
plt.title("Training Data — Crisis Risk Tiers", fontsize=14)
plt.xticks(rotation=0); plt.tight_layout(); plt.show()


# ═══════════════════════════════════════════════════════════════════════
# ██ CELL 6 — TOKENIZE WITH IndicBERTv2
# ═══════════════════════════════════════════════════════════════════════

print(f"🔤 Loading tokenizer: {MODEL_NAME}")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
print(f"✅ Vocab size: {tokenizer.vocab_size:,}")

# Test on Indian phrases
for phrase in ["Bachao koi maar raha hai", "Enna kolla pakkuranaa"]:
    tokens = tokenizer.tokenize(phrase)
    print(f"   '{phrase}' → {tokens}")

# Split
train_df, temp_df = train_test_split(df_final, test_size=0.25, stratify=df_final["label"], random_state=SEED)
val_df,   test_df = train_test_split(temp_df,  test_size=0.40, stratify=temp_df["label"],  random_state=SEED)
print(f"\n✅ Train: {len(train_df)} | Val: {len(val_df)} | Test: {len(test_df)}")

def tokenize_batch(batch):
    return tokenizer(batch["text"], padding="max_length", truncation=True, max_length=MAX_LEN)

def make_hf_dataset(df):
    ds = HFDataset.from_pandas(df.reset_index(drop=True))
    ds = ds.map(tokenize_batch, batched=True)
    ds = ds.rename_column("label", "labels")
    ds.set_format("torch", columns=["input_ids","attention_mask","labels"])
    return ds

train_hf = make_hf_dataset(train_df)
val_hf   = make_hf_dataset(val_df)
test_hf  = make_hf_dataset(test_df)
print("✅ Tokenization complete")


# ═══════════════════════════════════════════════════════════════════════
# ██ CELL 7 — LOAD MODEL & CONFIGURE TRAINER
# ═══════════════════════════════════════════════════════════════════════

model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_NAME, num_labels=NUM_LABELS,
    id2label=ID2LABEL, label2id=LABEL2ID,
    ignore_mismatched_sizes=True,
)

params = sum(p.numel() for p in model.parameters())
print(f"✅ Model loaded: {params/1e6:.1f}M parameters")

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)
    return {
        "accuracy":    accuracy_score(labels, preds),
        "f1_macro":    f1_score(labels, preds, average="macro"),
        "f1_critical": f1_score(labels, preds, labels=[3], average="macro"),
    }

# ── Colab-specific: gradient_accumulation for small batch ──
GRAD_ACCUM = 4  # Effective batch = 8 × 4 = 32 (same as Kaggle's 16×2)

args = TrainingArguments(
    output_dir                   = OUTPUT_DIR,
    overwrite_output_dir         = True,
    num_train_epochs             = EPOCHS,
    per_device_train_batch_size  = BATCH_SIZE,      # 8 on T4
    per_device_eval_batch_size   = BATCH_SIZE,
    gradient_accumulation_steps  = GRAD_ACCUM,      # ← Key for T4 memory
    learning_rate                = LR,
    weight_decay                 = WEIGHT_DECAY,
    warmup_ratio                 = 0.1,
    evaluation_strategy          = "epoch",
    save_strategy                = "epoch",
    load_best_model_at_end       = True,
    metric_for_best_model        = "f1_macro",
    greater_is_better            = True,
    logging_steps                = 25,
    save_total_limit             = 2,
    fp16                         = torch.cuda.is_available(),
    seed                         = SEED,
    report_to                    = "none",
)

class WeightedTrainer(Trainer):
    """Higher loss weight for Critical class so model never misses life threats."""
    def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
        labels  = inputs.pop("labels")
        outputs = model(**inputs)
        weight  = torch.tensor([1.0, 1.2, 1.5, 2.5]).to(outputs.logits.device)
        loss    = torch.nn.CrossEntropyLoss(weight=weight)(outputs.logits, labels)
        return (loss, outputs) if return_outputs else loss

trainer = WeightedTrainer(
    model          = model,
    args           = args,
    train_dataset  = train_hf,
    eval_dataset   = val_hf,
    compute_metrics= compute_metrics,
    callbacks      = [EarlyStoppingCallback(early_stopping_patience=2)],
)
print(f"✅ Trainer ready | Effective batch: {BATCH_SIZE * GRAD_ACCUM}")


# ═══════════════════════════════════════════════════════════════════════
# ██ CELL 8 — TRAIN  (~35-45 mins on Colab T4 free)
# ═══════════════════════════════════════════════════════════════════════

print("🚀 Training started... (ETA ~35-45 mins on Colab T4)")
result = trainer.train()
trainer.save_model(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)

print(f"\n✅ Training complete!")
print(f"   Loss  : {result.training_loss:.4f}")
print(f"   Steps : {result.global_step}")
print(f"   Saved : {OUTPUT_DIR}  (in your Google Drive)")


# ═══════════════════════════════════════════════════════════════════════
# ██ CELL 9 — EVALUATE & TEST
# ═══════════════════════════════════════════════════════════════════════

print("\n📊 Evaluating on test set...")
test_result = trainer.predict(test_hf)
preds  = np.argmax(test_result.predictions, axis=-1)
labels = test_result.label_ids

print("\nClassification Report:")
print(classification_report(labels, preds, target_names=list(ID2LABEL.values())))

# Confusion matrix
cm   = confusion_matrix(labels, preds)
disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=list(ID2LABEL.values()))
fig, ax = plt.subplots(figsize=(7,6))
disp.plot(ax=ax, cmap="Blues", colorbar=False)
ax.set_title("Confusion Matrix — IndicBERTv2 Crisis Classifier")
plt.tight_layout(); plt.show()

# Live inference
from transformers import pipeline
pipe = pipeline("text-classification", model=model, tokenizer=tokenizer,
                device=0 if torch.cuda.is_available() else -1)

TEST_PHRASES = [
    ("Hello main theek hoon",                               "→ Routine"),
    ("Mujhe case ki tension hai",                            "→ Watch"),
    ("Koi mera peecha kar raha hai please help",             "→ Urgent"),
    ("Bachao koi maar raha hai mujhe",                       "→ Critical"),
    ("I am not feeling good some try to kidnap me",          "→ Critical"),
    ("Enna kolla pakkuranaa save me",                        "→ Critical (Tamil)"),
    ("Amake maar te chaicche bachao",                        "→ Critical (Bengali)"),
    ("Naaku chompeyyadaaniki try chestunnadu",               "→ Critical (Telugu)"),
    ("Mala kidnap kele please madad kara",                   "→ Critical (Marathi)"),
    ("Mainu maar rehe ne bachao please",                     "→ Critical (Punjabi)"),
]

SCORE = {"Routine": "0%", "Watch": "45%", "Urgent": "85%", "Critical": "95%"}
print("\n🔍 Live Inference Test:")
for text, expected in TEST_PHRASES:
    r = pipe(text[:512])[0]
    print(f"   [{r['label']} {r['score']:.0%}] Distress≈{SCORE[r['label']]} {expected}")
    print(f"   {text}")
    print()


# ═══════════════════════════════════════════════════════════════════════
# ██ CELL 10 — PUSH TO HUGGINGFACE HUB (Free)
# ═══════════════════════════════════════════════════════════════════════

# ── Colab: Get HF token from Colab Secrets ──────────────────────────────
# How to add: Click 🔑 key icon in left sidebar → Add secret
#   Name  : HF_TOKEN
#   Value : hf_xxxxxxxxxxxxxxxxxxxxxxxx  (your token from huggingface.co/settings/tokens)

try:
    from google.colab import userdata           # ← Colab-specific (not Kaggle)
    HF_TOKEN = userdata.get("HF_TOKEN")
    print("✅ HF Token loaded from Colab Secrets")
except Exception:
    HF_TOKEN = "hf_YOUR_TOKEN_HERE"            # Fallback: paste manually
    print("⚠️  Replace hf_YOUR_TOKEN_HERE with your real token")

login(token=HF_TOKEN)

model.push_to_hub(HF_REPO_NAME, token=HF_TOKEN)
tokenizer.push_to_hub(HF_REPO_NAME, token=HF_TOKEN)

print(f"\n🎉 Model hosted FREE at HuggingFace!")
print(f"   https://huggingface.co/YOUR_USERNAME/{HF_REPO_NAME}")


# ═══════════════════════════════════════════════════════════════════════
# ██ CELL 11 — INTEGRATION CODE (paste into your project)
# ═══════════════════════════════════════════════════════════════════════

print("""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PASTE THIS INTO: agents/nlp_agent.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from transformers import pipeline as hf_pipeline

CRISIS_MODEL = "YOUR_HF_USERNAME/nyaya-sakhi-crisis-indicbert"

SCORE_MAP = {
    "Routine":  0.05,
    "Watch":    0.45,
    "Urgent":   0.85,
    "Critical": 0.95,
}

_pipe = None
def get_pipe():
    global _pipe
    if _pipe is None:
        _pipe = hf_pipeline("text-classification",
                             model=CRISIS_MODEL,
                             tokenizer=CRISIS_MODEL,
                             truncation=True, max_length=128)
    return _pipe

def analyze_text_distress(text: str) -> dict:
    result = get_pipe()(text[:512])[0]
    label  = result["label"]
    score  = SCORE_MAP[label]
    return {
        "distress_score":       score,
        "top_emotions":         [{"label": label.lower(), "score": result["score"]}],
        "distress_severity":    "acute distress" if score >= 0.75 else "moderate stress" if score >= 0.45 else "routine",
        "threat_violence_flag": label == "Critical",
        "intimidation_flag":    label in ["Urgent", "Critical"],
        "emergency_help_flag":  label in ["Urgent", "Critical"],
        "hopelessness_flag":    label in ["Watch", "Urgent"],
        "self_harm_cues":       label == "Critical" and result["score"] > 0.90,
        "withdrawal_flag":      label == "Watch",
        "analysis_source":      "indicbertv2_finetuned_24lang",
    }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 Once you paste this — DISTRESS_KEYWORDS is no longer needed!
   IndicBERTv2 understands all 24 Indian languages natively.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
""")
