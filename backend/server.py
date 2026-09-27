from datetime import datetime
from typing import Any
from fastapi import FastAPI,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel,Field
from shared.clone import clone_turn,negotiate
from shared.config import BACKEND_PORT,FRONTEND_URL
from shared.questionnaire import schema
from shared.storage import create,find_one,get,read_all,update,upsert

app=FastAPI(title="Binomi API",version="1.0.0")
app.add_middleware(CORSMiddleware,allow_origins=[FRONTEND_URL,"http://localhost:5173","http://127.0.0.1:5173"],allow_methods=["*"],allow_headers=["*"])

class EnterRequest(BaseModel):
    name:str=Field(min_length=1,max_length=80); language:str="en"; user_id:str|None=None
class QuestionnaireRequest(BaseModel):
    questionnaire:dict[str,Any]; language:str="en"
class MatchRequest(BaseModel):
    user_id:str; candidate_id:str; language:str="en"
class CloneRequest(BaseModel):
    user_id:str; message:str; history:list[dict[str,Any]]=[]; language:str="en"; session_id:str|None=None

def public_user(user,q=None):
    q=q or find_one("questionnaires",user_id=user["id"])
    return {"id":user["id"],"name":user["name"],"language":user.get("language","en"),"questionnaire":q.get("data",{}) if q else {}}

@app.get("/api/health")
def health(): return {"ok":True,"app":"Binomi"}

@app.get("/api/questionnaire/schema")
def questionnaire_schema(language="en"): return {"fields":schema(language)}

@app.post("/api/users/enter")
def enter(req:EnterRequest):
    name=req.name.strip()
    if req.user_id:
        existing=get("users",req.user_id)
        if existing:
            existing=update("users",existing["id"],{"name":name,"language":req.language,"last_seen":datetime.utcnow().isoformat()+"Z"}) or existing
            return public_user(existing)
    return public_user(create("users",{"name":name,"language":req.language,"created_at":datetime.utcnow().isoformat()+"Z"}))

@app.get("/api/users/{user_id}")
def user(user_id):
    u=get("users",user_id)
    if not u: raise HTTPException(404,"User not found")
    return public_user(u)

@app.put("/api/users/{user_id}/questionnaire")
def questionnaire(user_id,req:QuestionnaireRequest):
    if not get("users",user_id): raise HTTPException(404,"User not found")
    item=upsert("questionnaires",{"user_id":user_id},{"data":req.questionnaire,"language":req.language,"updated_at":datetime.utcnow().isoformat()+"Z"})
    update("users",user_id,{"language":req.language,"questionnaire_id":item["id"]})
    return {"ok":True,"questionnaire_id":item["id"],"questionnaire":req.questionnaire}

@app.get("/api/candidates/{user_id}")
def candidates(user_id):
    if not get("users",user_id): raise HTTPException(404,"User not found")
    if not find_one("questionnaires",user_id=user_id): return {"candidates":[]}
    out=[]
    for u in read_all("users"):
        if u["id"]==user_id: continue
        q=find_one("questionnaires",user_id=u["id"])
        if q: out.append(public_user(u,q))
    return {"candidates":out}

@app.post("/api/matches/run")
def run_match(req:MatchRequest):
    if req.user_id==req.candidate_id: raise HTTPException(400,"A user cannot match with themselves")
    ua,ub=get("users",req.user_id),get("users",req.candidate_id)
    qa,qb=find_one("questionnaires",user_id=req.user_id),find_one("questionnaires",user_id=req.candidate_id)
    if not ua or not ub or not qa or not qb: raise HTTPException(400,"Both users must complete questionnaires")
    a,b=public_user(ua,qa),public_user(ub,qb)
    conversation,analysis=negotiate(a,b,req.language)
    log=create("negotiation_logs",{"type":"clone_negotiation","user_a_id":a["id"],"user_b_id":b["id"],"participants":[a["name"],b["name"]],"conversation":conversation,"analysis":analysis,"created_at":datetime.utcnow().isoformat()+"Z"})
    match=create("matches",{"user_a_id":a["id"],"user_b_id":b["id"],"status":analysis["status"],"score":analysis["scores"]["overall"],"scores":analysis["scores"],"summary":analysis["summary"],"positives":analysis["positives"],"frictions":analysis["frictions"],"hard_conflicts":analysis["hard_conflicts"],"compromise":analysis["compromise"],"negotiation_log_id":log["id"],"created_at":datetime.utcnow().isoformat()+"Z"})
    return {"match":match,"other":b,"negotiation":log}

@app.get("/api/matches/{user_id}")
def matches(user_id,include_incompatible=True):
    out=[]
    for m in read_all("matches"):
        if user_id not in (m.get("user_a_id"),m.get("user_b_id")): continue
        if not include_incompatible and m["status"]=="incompatible": continue
        oid=m["user_b_id"] if m["user_a_id"]==user_id else m["user_a_id"]; other=get("users",oid)
        out.append({**m,"other":public_user(other) if other else {"id":oid,"name":"Unknown"}})
    return {"matches":sorted(out,key=lambda x:x.get("created_at",""),reverse=True)}

@app.get("/api/negotiations/{log_id}")
def negotiation(log_id):
    log=get("negotiation_logs",log_id)
    if not log: raise HTTPException(404,"Negotiation log not found")
    return log

@app.get("/api/clone/intro/{user_id}")
def clone_intro(user_id):
    u=get("users",user_id); q=find_one("questionnaires",user_id=user_id)
    if not u or not q: raise HTTPException(400,"Complete your questionnaire first")
    return {"intro":f"Hi, I'm {u['name']}'s Binomi clone. Ask me about my housing preferences, routines, priorities, or deal-breakers."}

@app.post("/api/clone/chat")
def clone_chat(req:CloneRequest):
    u=get("users",req.user_id); q=find_one("questionnaires",user_id=req.user_id)
    if not u or not q: raise HTTPException(400,"Complete your questionnaire first")
    chat_history=req.history+[{"role":"user","content":req.message}]
    reply=clone_turn(u["name"],q["data"],"you",chat_history,req.language,len(chat_history)//2+1)
    sid=req.session_id
    if not sid: sid=create("negotiation_logs",{"type":"clone_chat","user_id":req.user_id,"conversation":[],"created_at":datetime.utcnow().isoformat()+"Z"})["id"]
    log=get("negotiation_logs",sid)
    if not log: raise HTTPException(404,"Clone chat session not found")
    c=log.get("conversation",[]); c += [{"role":"user","content":req.message,"timestamp":datetime.utcnow().isoformat()+"Z"},{"role":"assistant","content":reply,"timestamp":datetime.utcnow().isoformat()+"Z"}]
    update("negotiation_logs",sid,{"conversation":c})
    return {"reply":reply,"session_id":sid}

if __name__=="__main__":
    import uvicorn
    uvicorn.run("backend.server:app",host="0.0.0.0",port=BACKEND_PORT,reload=True)
