#!/usr/bin/env python3
"""Sinh dữ liệu mẫu cho V3M HR Office.

Chạy:  python3 seed.py            -> ghi data/seed.json và web/js/seed.js
Dữ liệu được sinh có tính tất định (random.seed) để chạy lại cho cùng kết quả.
"""
import json
import os
import random
from datetime import date, datetime, timedelta

random.seed(2026)
HERE = os.path.dirname(os.path.abspath(__file__))
TODAY = date.today()

COMPANY = {
    "name": "V3M HR Office",
    "short": "V3M",
    "slogan": "AI · People · Growth",
    "port": 8787,
}

# ---------------------------------------------------------------- khu vực
ZONES = [
    {"id": "dieu-hanh", "name": "Phòng điều hành", "sub": "Ban giám đốc · Người thật · ra lệnh & duyệt",
     "icon": "👑", "color": "#f1e0b8", "accent": "#d8a21a", "x": 2, "y": 2, "w": 11, "h": 7},
    {"id": "leader-hub", "name": "Leader Hub", "sub": "Trưởng phòng · Trợ lý AI · Data Hub",
     "icon": "🧠", "color": "#d8e9f7", "accent": "#2f7bd1", "x": 14, "y": 2, "w": 12, "h": 7},
    {"id": "nhan-su", "name": "Phòng Nhân sự", "sub": "Tuyển dụng · Chấm công · Lương & Phúc lợi",
     "icon": "🧑‍💼", "color": "#dff2e4", "accent": "#1f9d55", "x": 27, "y": 2, "w": 12, "h": 7},
    {"id": "kinh-doanh", "name": "Phòng Kinh doanh", "sub": "Sales · CSKH · Đối tác",
     "icon": "💼", "color": "#dcf0ee", "accent": "#179e8f", "x": 2, "y": 10, "w": 12, "h": 9},
    {"id": "ky-thuat", "name": "Phòng Kỹ thuật", "sub": "Backend · Frontend · QA · Hạ tầng",
     "icon": "💻", "color": "#e3e2f5", "accent": "#5b4fcf", "x": 15, "y": 10, "w": 11, "h": 9},
    {"id": "marketing", "name": "Marketing & Creative", "sub": "Design · Content · Ads · Video",
     "icon": "🎨", "color": "#e9ddf5", "accent": "#8a4bd3", "x": 27, "y": 10, "w": 12, "h": 9},
    {"id": "le-tan", "name": "Sảnh lễ tân & Café", "sub": "Khách mời · Lễ tân · Nghỉ ngơi",
     "icon": "☕", "color": "#f3e6d8", "accent": "#b4652a", "x": 2, "y": 20, "w": 37, "h": 7},
]

# ---------------------------------------------------------------- tổ / đội
TEAMS = [
    {"id": "bgd", "name": "Ban giám đốc", "dept": "dieu-hanh", "color": "#d8a21a"},
    {"id": "leaders", "name": "Trưởng phòng", "dept": "leader-hub", "color": "#2f7bd1"},
    {"id": "hr", "name": "Tổ HR", "dept": "nhan-su", "color": "#1f9d55"},
    {"id": "tuyen-dung", "name": "Tổ Tuyển dụng", "dept": "nhan-su", "color": "#3cb371"},
    {"id": "sales-a", "name": "Tổ Alpha", "dept": "kinh-doanh", "color": "#179e8f"},
    {"id": "sales-b", "name": "Tổ Beta", "dept": "kinh-doanh", "color": "#0e7c70"},
    {"id": "cskh", "name": "Tổ CSKH", "dept": "kinh-doanh", "color": "#2bbfae"},
    {"id": "backend", "name": "Tổ Backend", "dept": "ky-thuat", "color": "#5b4fcf"},
    {"id": "frontend", "name": "Tổ Frontend", "dept": "ky-thuat", "color": "#7b6ff0"},
    {"id": "qa", "name": "Tổ QA", "dept": "ky-thuat", "color": "#3f37a3"},
    {"id": "content", "name": "Tổ Content", "dept": "marketing", "color": "#8a4bd3"},
    {"id": "design", "name": "Tổ Design", "dept": "marketing", "color": "#b06ce6"},
    {"id": "le-tan", "name": "Tổ Lễ tân", "dept": "le-tan", "color": "#b4652a"},
]

# ---------------------------------------------------------------- nhân sự
# (tên, giới tính, tổ, chức vụ)
PEOPLE = [
    ("Nguyễn Văn Huy", "M", "bgd", "CEO"),
    ("Trần Thu Hằng", "F", "bgd", "COO"),
    ("Lê Minh Quân", "M", "leaders", "Trưởng phòng Kinh doanh"),
    ("Phạm Ngọc Anh", "F", "leaders", "Trưởng phòng Kỹ thuật"),
    ("Hoàng Thị Mai", "F", "leaders", "Trưởng phòng Marketing"),
    ("Đỗ Thanh Tùng", "M", "leaders", "Trưởng phòng Nhân sự"),
    ("Vũ Thị Lan Hương", "F", "hr", "Chuyên viên C&B"),
    ("Bùi Hải Ly", "F", "hr", "Chuyên viên HR"),
    ("Ngô Xuân Bách", "M", "tuyen-dung", "Chuyên viên tuyển dụng"),
    ("Đinh Huy Đức", "M", "tuyen-dung", "Chuyên viên tuyển dụng"),
    ("Nguyễn Tuấn Anh", "M", "sales-a", "Tổ trưởng Sales"),
    ("Trần Văn Thành", "M", "sales-a", "Nhân viên Sales"),
    ("Lê Thị Thu Uyên", "F", "sales-a", "Nhân viên Sales"),
    ("Phạm Thu Yến", "F", "sales-a", "Nhân viên Sales"),
    ("Hoàng Duy Đức", "M", "sales-b", "Tổ trưởng Sales"),
    ("Vũ Hoàng Phúc", "M", "sales-b", "Nhân viên Sales"),
    ("Đặng Ngọc Xuân", "F", "sales-b", "Nhân viên Sales"),
    ("Nguyễn Yến Ly", "F", "sales-b", "Nhân viên Sales"),
    ("Trần Chang Anh", "F", "cskh", "Tổ trưởng CSKH"),
    ("Chu Mai Anh", "F", "cskh", "Nhân viên CSKH"),
    ("Lê Hoàng Nam", "M", "cskh", "Nhân viên CSKH"),
    ("Phan Minh Châu", "F", "cskh", "Nhân viên CSKH"),
    ("Nguyễn Đức Long", "M", "backend", "Tech Lead"),
    ("Trịnh Văn Khoa", "M", "backend", "Backend Developer"),
    ("Lý Thanh Sơn", "M", "backend", "Backend Developer"),
    ("Hà Phương Thảo", "F", "backend", "DevOps"),
    ("Đoàn Quang Minh", "M", "frontend", "Tổ trưởng Frontend"),
    ("Nguyễn Hồng Nhung", "F", "frontend", "Frontend Developer"),
    ("Tạ Văn Kiên", "M", "frontend", "Frontend Developer"),
    ("Mai Thị Hoa", "F", "qa", "QA Lead"),
    ("Lưu Đình Phong", "M", "qa", "QA Engineer"),
    ("Cao Thùy Linh", "F", "content", "Tổ trưởng Content"),
    ("Võ Thanh Trúc", "F", "content", "Content Writer"),
    ("Hồ Quốc Bảo", "M", "content", "SEO Specialist"),
    ("Dương Khánh Vy", "F", "design", "Tổ trưởng Design"),
    ("Phùng Gia Huy", "M", "design", "Graphic Designer"),
    ("Lương Bích Ngọc", "F", "design", "Video Editor"),
    ("Nguyễn Thị Ngọc Hân", "F", "le-tan", "Lễ tân"),
    ("Trần Bảo Trâm", "F", "le-tan", "Lễ tân"),
]

HAIR_COLORS = ["#2b1d14", "#1a1a1a", "#4a2c17", "#6b3e1e", "#8c5a2b", "#3b2a20"]
SKINS = ["#f6d7b8", "#f1c9a3", "#e8b58d", "#f8e0c8"]

AI_AGENTS = [
    {"id": "ai-leader", "name": "AI Leader", "dept": "leader-hub", "desc": "Tổng hợp báo cáo · nhắc việc"},
    {"id": "ai-data", "name": "Data Hub", "dept": "leader-hub", "desc": "Kho dữ liệu chấm công, KPI"},
    {"id": "ai-tuyen-dung", "name": "AI Tuyển dụng", "dept": "nhan-su", "desc": "Sàng lọc CV · đặt lịch phỏng vấn"},
    {"id": "ai-cham-cong", "name": "AI Chấm công", "dept": "nhan-su", "desc": "Đối soát vào/ra · cảnh báo muộn"},
    {"id": "ai-luong", "name": "AI Lương", "dept": "nhan-su", "desc": "Tính lương · phúc lợi"},
    {"id": "ai-cskh", "name": "AI CSKH", "dept": "kinh-doanh", "desc": "Trả lời khách · phân luồng ticket"},
    {"id": "ai-review", "name": "AI Code Review", "dept": "ky-thuat", "desc": "Review PR · kiểm tra lỗi"},
    {"id": "ai-content", "name": "AI Content", "dept": "marketing", "desc": "Gợi ý bài viết · SEO"},
    {"id": "ai-design", "name": "AI Design", "dept": "marketing", "desc": "Mockup · banner nhanh"},
]

TASK_TITLES = [
    "Báo cáo tuần", "Họp 1-1", "Cập nhật CRM", "Gọi khách hàng", "Review hợp đồng",
    "Fix bug đăng nhập", "Viết test case", "Deploy bản mới", "Thiết kế banner", "Viết bài blog",
    "Chạy chiến dịch Ads", "Phỏng vấn ứng viên", "Chốt bảng lương", "Đối soát chấm công",
    "Onboarding nhân viên mới", "Làm slide thuyết trình", "Trả lời ticket", "Tối ưu SEO",
]

VISITORS = [
    {"name": "Anh Khải", "org": "Đối tác KBI"}, {"name": "Chị Trang", "org": "Công ty SWT"},
    {"name": "Anh Hùng", "org": "2HT Logistics"}, {"name": "Chị Hà Vi", "org": "Havi Studio"},
    {"name": "Anh Tiến", "org": "VTT Group"}, {"name": "Chiến Lê", "org": "Ứng viên Backend"},
]


def slug(n):
    import unicodedata
    s = unicodedata.normalize("NFD", n).encode("ascii", "ignore").decode()
    return s.lower().replace(" ", "")


def gen_employees():
    emps = []
    for i, (name, gender, team, role) in enumerate(PEOPLE, start=1):
        team_obj = next(t for t in TEAMS if t["id"] == team)
        join = TODAY - timedelta(days=random.randint(60, 1500))
        # Tính cách công việc: ảnh hưởng tỉ lệ chuyên cần / KPI
        quality = random.uniform(0.62, 0.98)
        # vài nhân sự "có vấn đề" để demo quy tắc nháy đỏ / nhắc nhở
        quality = {"Vũ Thị Lan Hương": 0.38, "Bùi Hải Ly": 0.42, "Đặng Ngọc Xuân": 0.45, "Nguyễn Yến Ly": 0.5,
                   "Đinh Huy Đức": 0.68, "Ngô Xuân Bách": 0.7,
                   "Nguyễn Thị Ngọc Hân": 0.86, "Trần Bảo Trâm": 0.9}.get(name, quality)
        emps.append({
            "id": f"nv{i:03d}",
            "code": f"V3M{i:03d}",
            "name": name,
            "gender": gender,
            "dob": str(date(random.randint(1985, 2002), random.randint(1, 12), random.randint(1, 28))),
            "phone": "09" + "".join(random.choice("0123456789") for _ in range(8)),
            "email": slug(name) + "@v3m.vn",
            "role": role,
            "dept": team_obj["dept"],
            "team": team,
            "joinDate": str(join),
            "status": "active",
            "salary": random.choice([9, 11, 13, 15, 18, 22, 30, 45]) * 1_000_000,
            "avatar": {
                "skin": random.choice(SKINS),
                "hair": random.randint(0, 3),
                "hairColor": random.choice(HAIR_COLORS),
                "glasses": random.random() < 0.25,
            },
            "quality": round(quality, 3),  # dùng nội bộ để sinh dữ liệu
            "desk": None,
        })
    return emps


def gen_attendance(emps, days=35):
    rows = []
    for e in emps:
        q = e["quality"]
        for d in range(days, -1, -1):
            day = TODAY - timedelta(days=d)
            if day.weekday() == 6 and d != 0:  # chủ nhật nghỉ (trừ hôm nay để demo)
                continue
            r = random.random()
            if r < (1 - q) * 0.14:
                status = "absent"
            elif r < (1 - q) * 0.14 + 0.025:
                status = "leave"
            elif r < (1 - q) * 0.5:
                status = "late"
            elif r < (1 - q) * 0.5 + 0.08:
                status = "remote"
            else:
                status = "present"
            row = {"id": f"att-{e['id']}-{day}", "emp": e["id"], "date": str(day), "status": status,
                   "checkIn": None, "checkOut": None, "overtime": 0,
                   "tasksDone": 0, "tasksAssigned": 0, "kpi": 0}
            if status in ("present", "late", "remote"):
                late_min = random.randint(10, 75) if status == "late" else random.randint(-25, 9)
                cin = datetime.combine(day, datetime.min.time()).replace(hour=8, minute=30) + timedelta(minutes=late_min)
                cout = cin.replace(hour=17, minute=30) + timedelta(minutes=random.randint(-20, 150))
                row["checkIn"] = cin.strftime("%H:%M")
                row["checkOut"] = cout.strftime("%H:%M")
                row["overtime"] = max(0, round((cout - cout.replace(hour=17, minute=30)).seconds / 3600, 1)) if cout > cout.replace(hour=17, minute=30) else 0
                row["tasksAssigned"] = random.randint(3, 8)
                row["tasksDone"] = min(row["tasksAssigned"], int(row["tasksAssigned"] * random.uniform(q - 0.1, min(1.0, q + 0.3)) + 0.5))
                row["kpi"] = int(max(30, min(100, random.gauss(q * 100, 9))))
            # hôm nay: nếu chưa tới giờ về thì chưa checkout
            if d == 0 and row["checkIn"] and datetime.now().hour < 17:
                row["checkOut"] = None
                row["overtime"] = 0
            rows.append(row)
    return rows


def gen_tasks(emps):
    tasks = []
    n = 1
    for e in emps:
        for _ in range(random.randint(2, 5)):
            status = random.choices(["todo", "doing", "done"], [0.3, 0.35, 0.35])[0]
            due = TODAY + timedelta(days=random.randint(-3, 10))
            tasks.append({"id": f"task{n:04d}", "emp": e["id"], "title": random.choice(TASK_TITLES),
                          "status": status, "priority": random.choice(["low", "normal", "high"]),
                          "due": str(due), "created": str(due - timedelta(days=random.randint(2, 7)))})
            n += 1
    return tasks


def gen_leaves(emps):
    leaves = []
    n = 1
    for e in random.sample(emps, 12):
        start = TODAY + timedelta(days=random.randint(-10, 14))
        length = random.randint(1, 3)
        status = random.choice(["pending", "pending", "approved", "rejected"])
        leaves.append({"id": f"leave{n:03d}", "emp": e["id"], "type": random.choice(["Nghỉ phép năm", "Nghỉ ốm", "Việc riêng", "Nghỉ không lương"]),
                       "from": str(start), "to": str(start + timedelta(days=length - 1)), "days": length,
                       "reason": random.choice(["Về quê", "Khám sức khỏe", "Việc gia đình", "Đi du lịch", "Con ốm"]),
                       "status": status, "created": str(start - timedelta(days=random.randint(2, 6)))})
        n += 1
    return leaves


def gen_candidates():
    names = ["Lê Văn An", "Nguyễn Thị Bình", "Trần Minh Cường", "Phạm Thu Dung", "Vũ Quốc Em", "Bùi Thị Giang", "Đỗ Hữu Hải"]
    roles = ["Backend Developer", "Nhân viên Sales", "Graphic Designer", "QA Engineer", "Content Writer"]
    stages = ["Mới nộp", "Sàng lọc", "Phỏng vấn 1", "Phỏng vấn 2", "Đề nghị", "Từ chối"]
    out = []
    for i, nme in enumerate(names, start=1):
        out.append({"id": f"cand{i:03d}", "name": nme, "role": random.choice(roles), "stage": random.choice(stages[:5]),
                    "source": random.choice(["TopCV", "LinkedIn", "Giới thiệu", "Website"]),
                    "applied": str(TODAY - timedelta(days=random.randint(1, 20)))})
    return out


def build():
    emps = gen_employees()
    db = {
        "company": COMPANY,
        "settings": {
            "theme": "tet", "nameTags": True, "connections": True, "grid": False,
            "lights": True, "dayNight": "auto", "slideSeconds": 7, "slideshowAt": "16:30",
            "music": False,
        },
        "zones": ZONES,
        "teams": TEAMS,
        "employees": emps,
        "agents": AI_AGENTS,
        "attendance": gen_attendance(emps),
        "tasks": gen_tasks(emps),
        "leaves": gen_leaves(emps),
        "candidates": gen_candidates(),
        "visitors": [dict(v, date=str(TODAY)) for v in VISITORS],
        "rules": {
            "lateRate": 15, "attendanceRate": 90, "taskRate": 80, "kpiMin": 60,
            "redMinWarnings": 2, "windowDays": 30,
        },
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
    }
    for e in emps:
        e.pop("quality", None)
    return db


def write_all():
    db = build()
    os.makedirs(os.path.join(HERE, "data"), exist_ok=True)
    os.makedirs(os.path.join(HERE, "web", "js"), exist_ok=True)
    with open(os.path.join(HERE, "data", "seed.json"), "w", encoding="utf-8") as f:
        json.dump(db, f, ensure_ascii=False, indent=1)
    with open(os.path.join(HERE, "web", "js", "seed.js"), "w", encoding="utf-8") as f:
        f.write("// Tự sinh bởi seed.py – dùng khi mở index.html trực tiếp không có server\n")
        f.write("window.SEED_DATA = " + json.dumps(db, ensure_ascii=False) + ";\n")
    return db


if __name__ == "__main__":
    db = write_all()
    print(f"Đã sinh {len(db['employees'])} nhân sự, {len(db['attendance'])} bản ghi chấm công, "
          f"{len(db['tasks'])} công việc, {len(db['leaves'])} đơn nghỉ.")
