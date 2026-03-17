"""
reachout — FastAPI backend
Swap MOCK_MODE = False and fill API keys in .env to go live.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os, httpx, asyncio
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="reachout API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "https://reachout.vercel.app",  # Production frontend (update with your domain)
        "*",  # Allow all origins in production (restrict for security)
    ],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

HUNTER_API_KEY   = os.getenv("HUNTER_API_KEY", "")
RAPIDAPI_KEY     = os.getenv("RAPIDAPI_KEY", "")
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
ANTHROPIC_KEY    = os.getenv("ANTHROPIC_API_KEY", "")
SENDER_EMAIL     = os.getenv("SENDER_EMAIL", "pranaay.mudireddy@gmail.com")

MOCK_MODE = not (HUNTER_API_KEY or RAPIDAPI_KEY)  # Real search if at least one provider key exists.


# ─────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────

class Employee(BaseModel):
    id: str
    name: str
    title: str
    email: str
    company: str
    dept: str
    confidence: int

class SearchRequest(BaseModel):
    company: str

class GenerateRequest(BaseModel):
    employee: Employee
    tone: str = "professional"
    sender_name: str = ""
    sender_role: str = ""
    sender_bio: str = ""

class SendRequest(BaseModel):
    to_email: str
    to_name: str
    subject: str
    body: str

class BulkSendRequest(BaseModel):
    emails: List[SendRequest]


# ─────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "mock_mode": MOCK_MODE,
        "keys": {
            "hunter": bool(HUNTER_API_KEY),
            "rapidapi": bool(RAPIDAPI_KEY),
            "anthropic": bool(ANTHROPIC_KEY),
            "sendgrid": bool(SENDGRID_API_KEY),
        },
    }


@app.post("/api/search-employees")
async def search_employees(req: SearchRequest):
    """
    Find employees at a company using Hunter.io + RapidAPI LinkedIn scraper.
    Returns only real contacts from external providers if at least one key is available.
    """
    if MOCK_MODE:
        raise HTTPException(
            status_code=503,
            detail="Real contact search requires at least one provider key. Add HUNTER_API_KEY or RAPIDAPI_KEY in .env.",
        )

    employees = []

    # ── Hunter.io domain search ──
    try:
        domain = await _get_domain(req.company)
        if domain:
            hunter_data = await _hunter_search(domain)
            employees.extend(hunter_data)
    except Exception as e:
        print(f"Hunter.io error: {e}")

    # ── RapidAPI LinkedIn employees ──
    try:
        linkedin_data = await _rapidapi_linkedin(req.company)
        # Merge: avoid email duplicates
        existing_emails = {e["email"] for e in employees}
        for emp in linkedin_data:
            if emp.get("email") and emp["email"] not in existing_emails:
                employees.append(emp)
    except Exception as e:
        print(f"RapidAPI error: {e}")

    return {"employees": employees, "company": req.company, "count": len(employees)}


@app.post("/api/generate-email")
async def generate_email(req: GenerateRequest):
    """
    Use Claude to generate a personalised outreach email.
    """
    prompt = f"""Write a short, genuine cold outreach email for a job seeker.
Target: {req.employee.name}, {req.employee.title} at {req.employee.company} ({req.employee.dept} dept)
Sender: {req.sender_name or "a software engineer"}, {req.sender_role or "looking for new opportunities"}
Bio: {req.sender_bio or "passionate about building great products"}
Tone: {req.tone}

Rules: max 4 sentences, no "I hope this finds you well", reference their role naturally, low-pressure ask at the end.
Respond ONLY as JSON: {{"subject": "...", "body": "..."}}"""

    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 400,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=30,
        )
    data = res.json()
    text = data.get("content", [{}])[0].get("text", "")
    try:
        import json, re
        clean = re.sub(r"```json|```", "", text).strip()
        return json.loads(clean)
    except Exception:
        return {"subject": "Quick intro", "body": text}


@app.post("/api/send-email")
async def send_email(req: SendRequest):
    """
    Send a single email via SendGrid.
    """
    if MOCK_MODE:
        await asyncio.sleep(0.5)
        return {"status": "sent_mock", "to": req.to_email}

    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={
                "Authorization": f"Bearer {SENDGRID_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "personalizations": [{"to": [{"email": req.to_email, "name": req.to_name}]}],
                "from": {"email": SENDER_EMAIL},
                "subject": req.subject,
                "content": [{"type": "text/plain", "value": req.body}],
            },
            timeout=15,
        )
    if res.status_code not in (200, 202):
        raise HTTPException(status_code=500, detail=f"SendGrid error: {res.text}")
    return {"status": "sent", "to": req.to_email}


@app.post("/api/send-bulk")
async def send_bulk(req: BulkSendRequest):
    """Send all emails sequentially with a small delay to respect rate limits."""
    results = []
    for email in req.emails:
        try:
            result = await send_email(email)
            results.append({"email": email.to_email, "status": "sent"})
        except Exception as e:
            results.append({"email": email.to_email, "status": "failed", "error": str(e)})
        await asyncio.sleep(0.3)
    return {"results": results, "sent": sum(1 for r in results if r["status"] == "sent")}


# ─────────────────────────────────────────
# INTERNAL HELPERS
# ─────────────────────────────────────────

async def _get_domain(company: str) -> Optional[str]:
    """Guess company domain from company name. Returns domains to try."""
    # Common domain patterns
    simple = company.lower().replace(" ", "")
    candidates = [
        f"{simple}.com",
        f"{simple}.io",
        f"{simple}.ai",
        company.lower().replace(" ", "-") + ".com",
    ]
    
    # For well-known companies, return exact domain
    known = {
        "google": "google.com",
        "microsoft": "microsoft.com",
        "apple": "apple.com",
        "amazon": "amazon.com",
        "meta": "meta.com",
        "facebook": "facebook.com",
        "stripe": "stripe.com",
        "openai": "openai.com",
        "anthropic": "anthropic.com",
        "figma": "figma.com",
        "vercel": "vercel.com",
        "linear": "linear.app",
    }
    
    if company.lower() in known:
        return known[company.lower()]
    
    # Try Hunter API domain search if key is available
    if HUNTER_API_KEY:
        try:
            async with httpx.AsyncClient() as client:
                # Try domain search directly with likely domain
                for domain in candidates:
                    res = await client.get(
                        "https://api.hunter.io/v2/domain-search",
                        params={"domain": domain, "api_key": HUNTER_API_KEY, "limit": 1},
                        timeout=10,
                    )
                    if res.status_code == 200:
                        data = res.json()
                        if data.get("data", {}).get("emails"):
                            return domain
        except Exception as e:
            print(f"Hunter domain lookup error: {e}")
    
    # Return first candidate as fallback
    return candidates[0]


async def _hunter_search(domain: str) -> list:
    """Search Hunter.io for all emails at a domain."""
    async with httpx.AsyncClient() as client:
        res = await client.get(
            "https://api.hunter.io/v2/domain-search",
            params={"domain": domain, "api_key": HUNTER_API_KEY, "limit": 10},
            timeout=15,
        )
    data = res.json()
    emails = data.get("data", {}).get("emails", [])
    company = data.get("data", {}).get("organization", domain)
    results = []
    for i, e in enumerate(emails):
        if e.get("value"):
            results.append({
                "id": f"h_{domain}_{i}",
                "name": f"{e.get('first_name', '')} {e.get('last_name', '')}".strip() or "Unknown",
                "title": e.get("position", "Employee"),
                "email": e["value"],
                "company": company,
                "dept": e.get("department", "Unknown"),
                "confidence": e.get("confidence", 70),
            })
    return results


async def _rapidapi_linkedin(company: str) -> list:
    """
    Search LinkedIn via RapidAPI for employees at a company.
    Uses the 'Fresh LinkedIn Profile Data' endpoint on RapidAPI.
    Replace the host/endpoint to match whichever LinkedIn API you subscribe to.
    """
    async with httpx.AsyncClient() as client:
        res = await client.get(
            "https://fresh-linkedin-profile-data.p.rapidapi.com/search-employees",
            params={"company_name": company, "title": "engineer", "page": "1"},
            headers={
                "X-RapidAPI-Key": RAPIDAPI_KEY,
                "X-RapidAPI-Host": "fresh-linkedin-profile-data.p.rapidapi.com",
            },
            timeout=15,
        )
    data = res.json()
    employees = data.get("data", [])
    results = []
    for i, emp in enumerate(employees[:15]):
        email = (emp.get("email") or "").strip()
        full_name = (emp.get("full_name") or "").strip()
        linkedin_url = (emp.get("linkedin_url") or emp.get("profile_url") or emp.get("url") or "").strip()

        # Keep only contacts that have a visible LinkedIn identity and a real email.
        if not full_name or not linkedin_url or not email:
            continue

        results.append({
            "id": f"li_{company}_{i}",
            "name": full_name,
            "title": emp.get("job_title", "Employee"),
            "email": email,
            "company": company,
            "dept": emp.get("sub_title", "Engineering"),
            "confidence": 90,
            "linkedin_url": linkedin_url,
            "source": "linkedin",
        })
    return results


def _guess_email(first: str, last: str, company: str) -> str:
    """Fallback: guess common email format first.last@company.com"""
    domain = company.lower().replace(" ", "") + ".com"
    return f"{first.lower()}.{last.lower()}@{domain}"


def _mock_employees(company: str) -> dict:
    MOCK = {
        "google": [
            {"id": "g1", "name": "Sarah Chen", "title": "Senior Software Engineer", "email": "s.chen@google.com", "company": "Google", "dept": "Infrastructure", "confidence": 94},
            {"id": "g2", "name": "Marcus Webb", "title": "Engineering Manager", "email": "m.webb@google.com", "company": "Google", "dept": "Platform", "confidence": 91},
            {"id": "g4", "name": "Tom Eriksson", "title": "Tech Recruiter", "email": "t.eriksson@google.com", "company": "Google", "dept": "People Ops", "confidence": 97},
        ],
        "stripe": [
            {"id": "s1", "name": "Alex Moreau", "title": "Software Engineer", "email": "alex.moreau@stripe.com", "company": "Stripe", "dept": "Payments", "confidence": 96},
            {"id": "s3", "name": "Dana Kowalski", "title": "Engineering Recruiter", "email": "d.kowalski@stripe.com", "company": "Stripe", "dept": "Talent", "confidence": 98},
        ],
        "openai": [
            {"id": "o1", "name": "Lena Fischer", "title": "Research Engineer", "email": "l.fischer@openai.com", "company": "OpenAI", "dept": "Research", "confidence": 89},
            {"id": "o2", "name": "Raj Patel", "title": "ML Engineer", "email": "r.patel@openai.com", "company": "OpenAI", "dept": "Alignment", "confidence": 85},
            {"id": "o3", "name": "Chris Tanaka", "title": "Technical Recruiter", "email": "c.tanaka@openai.com", "company": "OpenAI", "dept": "Recruiting", "confidence": 95},
        ],
        "anthropic": [
            {"id": "a1", "name": "Maya Torres", "title": "Software Engineer", "email": "m.torres@anthropic.com", "company": "Anthropic", "dept": "Core", "confidence": 90},
            {"id": "a2", "name": "Ben Lawson", "title": "Senior Recruiter", "email": "b.lawson@anthropic.com", "company": "Anthropic", "dept": "People", "confidence": 96},
        ],
        "figma": [
            {"id": "f1", "name": "Nora Ahmed", "title": "Product Engineer", "email": "n.ahmed@figma.com", "company": "Figma", "dept": "Editor", "confidence": 91},
            {"id": "f2", "name": "Tyler Kim", "title": "Recruiting Lead", "email": "t.kim@figma.com", "company": "Figma", "dept": "Talent", "confidence": 94},
        ],
        "vercel": [
            {"id": "v1", "name": "Emily Ruiz", "title": "Frontend Engineer", "email": "e.ruiz@vercel.com", "company": "Vercel", "dept": "DX", "confidence": 92},
            {"id": "v2", "name": "Noah Park", "title": "Technical Recruiter", "email": "n.park@vercel.com", "company": "Vercel", "dept": "People Ops", "confidence": 95},
        ],
        "linear": [
            {"id": "l1", "name": "Iris Wong", "title": "Software Engineer", "email": "i.wong@linear.app", "company": "Linear", "dept": "Product", "confidence": 90},
            {"id": "l2", "name": "Owen Baker", "title": "Talent Partner", "email": "o.baker@linear.app", "company": "Linear", "dept": "Talent", "confidence": 93},
        ],
    }
    key = company.lower()
    found = MOCK.get(key, [])
    if not found:
        # Provide realistic demo data for any company while in mock mode.
        comp = company.strip() or "Company"
        found = [
            {"id": f"x_{key}_1", "name": "Avery Singh", "title": "Software Engineer", "email": _guess_email("avery", "singh", comp), "company": comp, "dept": "Engineering", "confidence": 78},
            {"id": f"x_{key}_2", "name": "Jordan Lee", "title": "Engineering Manager", "email": _guess_email("jordan", "lee", comp), "company": comp, "dept": "Platform", "confidence": 74},
            {"id": f"x_{key}_3", "name": "Morgan Diaz", "title": "Technical Recruiter", "email": _guess_email("morgan", "diaz", comp), "company": comp, "dept": "People", "confidence": 82},
        ]
    return {"employees": found, "company": company, "count": len(found)}
