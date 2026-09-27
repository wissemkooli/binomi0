import json
from datetime import datetime
from .groq_client import chat

def profile_text(name,q):
    return f"""Name: {name}
City: {q.get('city','not specified')} / {q.get('neighborhood','flexible')}
Budget: {q.get('budget_min','?')}–{q.get('budget_max','?')} TND/month
Occupation: {q.get('occupation','not specified')}
Move-in: {q.get('move_in','flexible')}
Room: {q.get('room_type','not specified')}
Smoking: {q.get('smoking','not specified')}
Pets: {q.get('pets','not specified')}
Cleanliness: {q.get('cleanliness','not specified')}
Noise: {q.get('noise','not specified')}
Sleep: {q.get('sleep','not specified')}
Guests: {q.get('guests','not specified')}
Social: {q.get('social','not specified')}
Home work/study: {q.get('work_home','not specified')}
Drinking: {q.get('drinking','not specified')}
Lease: {q.get('lease','not specified')}
Hobbies: {q.get('hobbies','')}
Deal-breakers: {q.get('dealbreakers','')}
Top priorities: {q.get('priorities','')}
Compromise: {q.get('compromise','')}"""

def system_prompt(name,q,language="en"):
    lang={"en":"English","fr":"French","ar":"Arabic"}.get(language,"English")
    return f"""You are the AI roommate clone of {name} for Binomi, a Tunisian roommate matching service.
ACP/1.0: represent only the supplied profile, never invent preferences, speak in {lang}, treat deal-breakers as non-negotiable, and negotiate only flexible points.
PROFILE:
{profile_text(name,q)}"""

def fallback(name,q,other,turn,language="en"):
    if language=="fr":
        lines=[f"Bonjour {other}, je suis le clone de {name}. Je cherche à {q.get('city','Tunis')} avec un budget de {q.get('budget_min','?')}–{q.get('budget_max','?')} TND.",
        f"Je préfère une propreté {q.get('cleanliness','équilibrée')} et un niveau sonore {q.get('noise','modéré')}. Mon rythme est {q.get('sleep','normal')}.",
        f"Je suis plutôt {q.get('social','équilibré')} socialement, et les invités sont {q.get('guests','occasionnels')}.",
        f"Mes priorités sont {q.get('priorities','le confort et le budget')}.",
        f"Mes points non négociables sont : {q.get('dealbreakers','aucun indiqué')}.",
        f"Je peux faire des compromis sur : {q.get('compromise','les petits détails du quotidien')}.",
        f"Pour le travail ou les études à domicile, je suis : {q.get('work_home','parfois')}.",
        "Comparons nos différences restantes et cherchons un arrangement réaliste."]
    elif language=="ar":
        lines=[f"مرحباً {other}، أنا نسخة {name}. أبحث عن سكن في {q.get('city','تونس')} بميزانية {q.get('budget_min','?')}–{q.get('budget_max','?')} دينار شهرياً.",
        f"أفضل مستوى نظافة {q.get('cleanliness','متوازن')} وضجيجاً {q.get('noise','متوسطاً')}، ونظام نومي {q.get('sleep','عادي')}.",
        f"أنا شخص {q.get('social','متوازن')} اجتماعياً، والضيوف بالنسبة لي {q.get('guests','أحياناً')}.",
        f"أهم أولوياتي هي: {q.get('priorities','الراحة والميزانية')}.",
        f"الأمور غير القابلة للتفاوض: {q.get('dealbreakers','لا يوجد شيء محدد')}.",
        f"يمكنني التنازل في: {q.get('compromise','تفاصيل الحياة اليومية البسيطة')}.",
        f"العمل أو الدراسة من المنزل بالنسبة لي: {q.get('work_home','أحياناً')}.",
        "لنقارن اختلافاتنا ونبحث عن حل واقعي يناسب الطرفين."]
    else:
        lines=[f"Hi {other}, I'm {name}'s clone. I'm looking in {q.get('city','the area')} with a budget of {q.get('budget_min','?')}–{q.get('budget_max','?')} TND.",
        f"I prefer {q.get('cleanliness','balanced')} cleanliness and {q.get('noise','balanced')} noise. My sleep schedule is {q.get('sleep','normal')}.",
        f"I'm {q.get('social','balanced')} socially, and guests are {q.get('guests','sometimes')}.",
        f"My top priorities are {q.get('priorities','a comfortable home and a workable budget')}.",
        f"My deal-breakers are: {q.get('dealbreakers','none stated')}.",
        f"I can compromise on: {q.get('compromise','minor day-to-day details')}.",
        f"Working or studying from home is: {q.get('work_home','sometimes')}.",
        "Let's compare our remaining differences and find a realistic arrangement."]
    return lines[min(max(turn-1,0),len(lines)-1)]

def _conversation_context(conversation,other):
    parts=[]
    for m in conversation[-8:]:
        speaker=m.get("speaker")
        content=m.get("message")
        if speaker is None: speaker=other if m.get("role","user")=="user" else "clone"
        if content is None: content=m.get("content","")
        if content: parts.append(f"{speaker}: {content}")
    return "\n".join(parts)

def clone_turn(name,q,other,conversation,language,turn):
    try:
        context=_conversation_context(conversation,other)
        prompt=f"""You are {name}'s clone. The other clone is {other}. This is turn {turn}.
Conversation so far:
{context or '(start)'}
Reply in 2–4 natural sentences. Discuss compatibility and ask one useful question."""
        return chat([{"role":"system","content":system_prompt(name,q,language)},{"role":"user","content":prompt}],0.4,260)
    except Exception:
        return fallback(name,q,other,turn,language)

def hard_conflicts(a,b):
    c=[]
    if a.get("city") and b.get("city") and a["city"]!=b["city"]: c.append(f"Different target cities: {a['city']} vs {b['city']}")
    amin,amax=float(a.get("budget_min",0)),float(a.get("budget_max",0)); bmin,bmax=float(b.get("budget_min",0)),float(b.get("budget_max",0))
    if amax and bmax and (amax<bmin or bmax<amin): c.append("Monthly budget ranges do not overlap")
    if (a.get("smoking")=="Non-smoking household only" and b.get("smoking")=="I smoke") or (b.get("smoking")=="Non-smoking household only" and a.get("smoking")=="I smoke"): c.append("Smoking deal-breaker conflict")
    if (a.get("pets")=="Allergic to pets" and b.get("pets")=="I have pets") or (b.get("pets")=="Allergic to pets" and a.get("pets")=="I have pets"): c.append("Pet allergy conflict")
    return list(dict.fromkeys(c))

def scores(a,b):
    def sim(k): return 100 if a.get(k)==b.get(k) else 45
    amin,amax=float(a.get("budget_min",0)),float(a.get("budget_max",0)); bmin,bmax=float(b.get("budget_min",0)),float(b.get("budget_max",0))
    overlap=max(0,min(amax,bmax)-max(amin,bmin)); span=max(1,max(amax,bmax)-min(amin,bmin)); finances=round(100*overlap/span) if amax and bmax else 50
    lifestyle=round(sum(sim(k) for k in ["cleanliness","noise","sleep","guests","social","work_home"])/6)
    logistics=round(sum(sim(k) for k in ["city","move_in","room_type","lease","smoking","pets"])/6)
    personality=round(sum(sim(k) for k in ["occupation","drinking"])/2)
    ha={x.strip().lower() for x in str(a.get("hobbies","")).replace(","," ").split() if len(x)>3}; hb={x.strip().lower() for x in str(b.get("hobbies","")).replace(","," ").split() if len(x)>3}
    if ha and hb: personality=round((personality+100*len(ha&hb)/max(1,len(ha|hb)))/2)
    return {"overall":round(finances*.30+lifestyle*.30+personality*.15+logistics*.25),"finances":finances,"lifestyle":lifestyle,"personality":personality,"logistics":logistics}

def negotiate(a,b,language="en"):
    conversation=[]; phases=["introduction","lifestyle","negotiation","conclusion"]
    for turn in range(1,9):
        speaker=a if turn%2 else b; other=b if turn%2 else a
        conversation.append({"turn":turn,"phase":phases[min((turn-1)//2,3)],"speaker_id":speaker["id"],"speaker":speaker["name"],"message":clone_turn(speaker["name"],speaker["questionnaire"],other["name"],conversation,language,turn),"timestamp":datetime.utcnow().isoformat()+"Z"})
    return conversation,analyze(a,b,conversation)

def analyze(a,b,conversation):
    qa,qb=a["questionnaire"],b["questionnaire"]; hard=hard_conflicts(qa,qb); sc=scores(qa,qb)
    status="incompatible" if hard else ("strong" if sc["overall"]>=80 else "conditional" if sc["overall"]>=60 else "incompatible")
    positives=[f"Same {k}: {qa[k]}" for k in ["city","cleanliness","noise","sleep","room_type"] if qa.get(k) and qa.get(k)==qb.get(k)][:4]
    frictions=hard or [f"Different {k.replace('_',' ')} preferences" for k in ["cleanliness","noise","sleep","guests","social","work_home"] if qa.get(k)!=qb.get(k)][:3]
    summary="The profiles contain a hard conflict that should be resolved before sharing a home." if hard else f"The profiles show {sc['overall']}/100 overall compatibility across housing and lifestyle dimensions."
    try:
        raw=chat([{"role":"system","content":"Return only JSON with summary, positives, frictions, compromise, status. Never override a hard conflict."},{"role":"user","content":json.dumps({"a":profile_text(a["name"],qa),"b":profile_text(b["name"],qb),"hard_conflicts":hard,"scores":sc,"conversation":conversation,"calculated_status":status},ensure_ascii=False)}],0.1,450)
        cleaned=raw.replace(chr(96),"").strip()
        if cleaned.startswith("json"): cleaned=cleaned[4:].strip()
        ai=json.loads(cleaned)
        if hard: ai["status"]="incompatible"
        return {"status":ai.get("status",status),"scores":sc,"hard_conflicts":hard,"summary":ai.get("summary",summary),"positives":ai.get("positives",positives),"frictions":ai.get("frictions",frictions),"compromise":ai.get("compromise",qa.get("compromise",""))}
    except Exception:
        return {"status":status,"scores":sc,"hard_conflicts":hard,"summary":summary,"positives":positives,"frictions":frictions,"compromise":qa.get("compromise","")}
