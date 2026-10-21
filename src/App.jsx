import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  House, CheckSquare, Timer, ChartNoAxesCombined, Settings, Bell, Plus, ArrowUpRight, Sparkles, CalendarDays, CircleCheck,
  Clock3, Flame, Target, Send, Play, Pause, RotateCcw, Sun,
  Coffee, Zap, ChevronRight, MoreHorizontal, X
} from "lucide-react";
import "./App.css";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "https://alexa-life-desk-api.onrender.com").replace(/\/+$/, "");
const initialTasks = [
  { id: 1, title: "Review machine learning notes", time: "09:30 AM", category: "Study", done: false, priority: "High" },
  { id: 2, title: "Complete internship learning module", time: "11:00 AM", category: "Career", done: false, priority: "High" },
  { id: 3, title: "Practice Java fundamentals", time: "02:00 PM", category: "Learning", done: true, priority: "Medium" },
  { id: 4, title: "Plan tomorrow's priorities", time: "04:30 PM", category: "Personal", done: false, priority: "Low" }
];

const initialMessages = [
  { from: "ai", text: "Hey there! * I'm your Life Desk assistant. Want to plan your day, add a task, or find your next priority?" }
];

function App() {
  const [page, setPage] = useState("Overview");
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem("alexa-life-desk-tasks");
      return saved ? JSON.parse(saved) : initialTasks;
    } catch { return initialTasks; }
  });
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const sendingRef = useRef(false);
  const [newTask, setNewTask] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState("");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    localStorage.setItem("alexa-life-desk-tasks", JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      if (seconds === 0) {
        if (minutes === 0) {
          setRunning(false);
          setToast("Focus session complete! Take a short break.");
          return;
        }
        setMinutes(m => m - 1);
        setSeconds(59);
      } else setSeconds(s => s - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [running, minutes, seconds]);

  const completed = tasks.filter(t => t.done).length;
  const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  const dateLabel = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const greeting = "Hello everyone";

  function notify(message) {
    setToast(message);
    setTimeout(() => setToast(""), 2600);
  }

  function addTask(title) {
    const clean = title.trim();
    if (!clean) return "Please enter a task to add.";
    setTasks(prev => [...prev, { id: Date.now(), title: clean, time: "Anytime", category: "Personal", done: false, priority: "Medium" }]);
    setNewTask("");
    return `Added "${clean}" to your tasks.`;
  }

  function toggleTask(id) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }

  async function respond(text) {
    const command = text.trim();
    if (!command || sendingRef.current) return;

    const lower = command.toLowerCase();
    let answer = "";
    const taskPrefixes = ["remind me to ", "remember to ", "create task: ", "create task ", "add task: ", "add task ", "add "];
    const prefix = taskPrefixes.find(p => lower.startsWith(p));

    if (prefix) answer = addTask(command.slice(prefix.length).trim());
    else if (lower.includes("timetable") || lower.includes("set a schedule") || lower.includes("make me a schedule") || lower.includes("plan my study")) {
      const openTasks = tasks.filter(t => !t.done);
      const priorityRank = { high: 0, medium: 1, low: 2 };
      const orderedTasks = [...openTasks].sort((a, b) =>
        (priorityRank[(a.priority || "").toLowerCase()] ?? 3) -
        (priorityRank[(b.priority || "").toLowerCase()] ?? 3)
      );
      answer = orderedTasks.length
        ? `## Your study timetable\n\n${orderedTasks.map((t, i) => `**${t.time && t.time !== "Anytime" ? t.time : ["9:00 AM", "11:00 AM", "2:00 PM", "4:00 PM", "6:00 PM"][i % 5]}** — ${t.title} (${t.priority || "Normal"} priority)`).join("\n\n")}\n\nStart with one task, take a short break between sessions, and adjust the times to fit your day.`
        : "You have no open tasks right now. Add your subjects or study tasks, and I'll organize them into a timetable.";
    } else if (lower.includes("which subjects") || lower.includes("what subjects") || lower.includes("what should i study")) {
      const openTasks = tasks.filter(t => !t.done);
      const studyTasks = openTasks.filter(t =>
        /machine learning|internship|java|python|ece|exam|study|course|module/i.test(t.title)
      );
      answer = studyTasks.length
        ? `Based on your current tasks, prioritize:\n${studyTasks.map((t, i) => `${i + 1}. ${t.title}`).join("\n")}\nStart with the highest-priority item and study one topic at a time.`
        : "Start with your nearest academic deadline, then review your weakest subject and practice coding.";
    } else if (lower.includes("plan my day")) {
      const next = tasks.find(t => !t.done && t.priority === "High") || tasks.find(t => !t.done);
      answer = `You have ${tasks.filter(t => !t.done).length} open tasks. Start with "${next?.title || "a small meaningful task"}".`;
    } else if (lower.includes("next priority") || lower.includes("what next")) {
      const next = tasks.find(t => !t.done && t.priority === "High") || tasks.find(t => !t.done);
      answer = `Your next task is "${next?.title || "all caught up"}".`;
    } else if (lower.includes("progress")) {
      answer = `You have completed ${completed} of ${tasks.length} tasks (${progress}%). Keep going!`;
    } else if (lower.includes("clear completed")) {
      setTasks(prev => prev.filter(t => !t.done));
      answer = "Completed tasks cleared from your list.";
    }

    setMessages(prev => [...prev, { from: "you", text: command }]);
    setInput("");

    if (answer) {
      setMessages(prev => [...prev, { from: "ai", text: answer }]);
      return;
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sendingRef.current = true;
    setIsSending(true);
    setMessages(prev => [...prev, { from: "ai", text: "Thinking...", pending: true, id }]);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: command, provider: "gemini" }),
        signal: controller.signal
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI request failed.");
      answer = typeof data.answer === "string" && data.answer.trim()
        ? data.answer : "The AI returned an empty response. Please try again.";
    } catch (error) {
      answer = error.name === "AbortError"
        ? "The request timed out after 30 seconds. Please try again."
        : (error.message || "Could not connect to the AI backend.");
    } finally {
      clearTimeout(timeout);
      sendingRef.current = false;
      setIsSending(false);
    }

    setMessages(prev => prev.map(m => m.id === id ? { ...m, text: answer, pending: false } : m));
  }
  const nav = [
    { name: "Overview", icon: House },
    { name: "My tasks", icon: CheckSquare },
    { name: "Focus room", icon: Timer },
    { name: "Insights", icon: ChartNoAxesCombined },

    { name: "Projects", icon: Sparkles },
    { name: "Settings", icon: Settings }
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={e => { e.preventDefault(); setPage("Overview"); }}>
          <span className="brand-mark"><Sparkles size={21} /></span>
          <span><strong>life desk<span className="brand-dot">.</span></strong><small>YOUR PERSONAL SPACE</small></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav>{nav.map(item => <button key={item.name} className={`nav-item ${page === item.name ? "active" : ""}`} onClick={() => setPage(item.name)}><item.icon size={18} strokeWidth={1.8} /><span>{item.name}</span>{item.name === "My tasks" && <span className="nav-count">{tasks.filter(t => !t.done).length}</span>}</button>)}</nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip"><span className="tip-icon"><Sun size={18} /></span><strong>A little reminder</strong><p>You don't have to do it all. Just the next thing.</p><span className="tip-spark">*</span></div>
          <button className="nav-item settings" onClick={() => setPage("Settings")}><Settings size={18} /> Settings</button>
          <div className="profile"><div className="avatar">S</div><div><strong>Your space</strong><small>Personal workspace</small></div><MoreHorizontal size={19} /></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">Workspace <ChevronRight size={14} /> <span>{page}</span></div>
          <div className="top-actions"><span className="date-chip"><CalendarDays size={15} /> {dateLabel}</span><button className="icon-button" aria-label="Notifications" onClick={() => notify("You're all caught up!") }><Bell size={18} /></button><div className="mini-avatar">S</div></div>
        </header>

        {page === "Overview" && <div className="page-content">
          <section className="welcome-row"><div><div className="eyebrow"><span className="live-dot" /> YOUR DAY, YOUR PACE</div><h1>{greeting},<br /><span>let's make room for good things.</span></h1><p className="welcome-sub">A calmer way to organise your day. One little win at a time.</p></div><div className="welcome-art"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-sun"><Sun size={37} /></div><span className="art-star star-one">*</span><span className="art-star star-two">*</span><span className="art-caption">take it<br />one day at a time</span></div></section>

          <section className="stat-grid">
            <div className="stat-card lavender"><div className="stat-top"><span>Tasks completed</span><span className="stat-icon"><CircleCheck size={18} /></span></div><div className="stat-number">{completed}<small> / {tasks.length}</small></div><div className="progress-track"><span style={{width: `${progress}%`}} /></div><div className="stat-foot">{progress}% of your list complete <ArrowUpRight size={14} /></div></div>
            <div className="stat-card mint"><div className="stat-top"><span>Focus sessions</span><span className="stat-icon"><Target size={18} /></span></div><div className="stat-number">2<small> sessions</small></div><div className="mini-bars">{[36,58,44,80,52,92,66,76,47,88,60,72].map((h,i)=><span key={i} style={{height:`${h}%`}} />)}</div><div className="stat-foot">A little progress adds up <ArrowUpRight size={14} /></div></div>
            <div className="stat-card peach"><div className="stat-top"><span>Daily streak</span><span className="stat-icon"><Flame size={18} /></span></div><div className="stat-number">3<small> days</small></div><div className="streak-dots"><span className="filled"/><span className="filled"/><span className="filled"/><span/><span/><span/><span/></div><div className="stat-foot">Keep your gentle momentum <ArrowUpRight size={14} /></div></div>
          </section>

          <section className="content-grid">
            <div className="panel tasks-panel"><div className="panel-heading"><div><span className="section-kicker">YOUR CHECKLIST</span><h2>Today's tasks <span className="heading-count">{tasks.filter(t=>!t.done).length}</span></h2></div><button className="text-action" onClick={() => setPage("My tasks")}>View all <ArrowUpRight size={15}/></button></div>
              <div className="task-list">{tasks.slice(0,4).map(task => <TaskRow key={task.id} task={task} onToggle={toggleTask} />)}</div>
              <form className="quick-add" onSubmit={e => {e.preventDefault(); if(newTask.trim()) notify(addTask(newTask));}}><Plus size={18}/><input value={newTask} onChange={e=>setNewTask(e.target.value)} placeholder="Add a little task to your day..." aria-label="New task"/><button type="submit">Add task</button></form>
            </div>
            <div className="right-stack">
              <div className="panel focus-card"><div className="panel-heading"><div><span className="section-kicker">MAKE SPACE</span><h2>Focus moment</h2></div><span className="soft-icon"><Coffee size={18}/></span></div><p className="panel-description">A small pocket of time, just for you.</p><div className="focus-preview"><div className="focus-ring"><div><strong>25<span>:00</span></strong><small>MINUTES</small></div></div><div className="focus-copy"><strong>One thing at a time.</strong><span>Put the noise aside.</span></div></div><button className="primary-button" onClick={() => setPage("Focus room")}><Play size={16} fill="currentColor"/> Start focusing</button></div>
              <div className="quote-card"><span className="quote-mark">"</span><p>Small steps every day add up to big change.</p><span className="quote-credit">A GENTLE REMINDER</span><span className="quote-flower">*</span></div>
            </div>
          </section>
        </div>}

        {page === "My tasks" && <div className="page-content inner-page"><div className="page-intro"><span className="section-kicker">MAKE IT MANAGEABLE</span><h1>Your tasks, <span>your pace.</span></h1><p>Every little thing you finish is a win.</p></div><div className="panel full-panel"><div className="panel-heading"><h2>All tasks <span className="heading-count">{tasks.filter(t=>!t.done).length} left</span></h2></div>{tasks.map(task => <TaskRow key={task.id} task={task} onToggle={toggleTask} />)}<form className="quick-add" onSubmit={e=>{e.preventDefault(); if(newTask.trim()) notify(addTask(newTask));}}><Plus size={18}/><input value={newTask} onChange={e=>setNewTask(e.target.value)} placeholder="What else is on your mind?" aria-label="New task"/><button type="submit">Add task</button></form></div></div>}

        {page === "Focus room" && <div className="page-content inner-page focus-page"><div className="page-intro"><span className="section-kicker">A LITTLE SPACE FOR YOU</span><h1>Find your <span>focus.</span></h1><p>You don't need a perfect day. Just a few focused minutes.</p></div><div className="panel timer-panel"><span className="timer-label"><Zap size={16}/> FOCUS SESSION</span><div className="big-timer">{String(minutes).padStart(2,"0")}:{String(seconds).padStart(2,"0")}</div><p>{running ? "You're doing great. Stay with this one thing." : "Ready when you are. Take a breath."}</p><div className="timer-controls"><button className="primary-button" onClick={()=>setRunning(v=>!v)}>{running?<Pause size={17}/>:<Play size={17} fill="currentColor"/>}{running?"Pause focus":"Begin focus"}</button><button className="icon-button reset-button" aria-label="Reset timer" onClick={()=>{setRunning(false);setMinutes(25);setSeconds(0);}}><RotateCcw size={18}/></button></div><div className="timer-presets">{[15,25,45].map(m=><button key={m} className={minutes===m&&seconds===0?"selected":""} onClick={()=>{setRunning(false);setMinutes(m);setSeconds(0);}}>{m} minutes</button>)}</div></div></div>}

        {page === "Insights" && <div className="page-content inner-page"><div className="page-intro"><span className="section-kicker">NOTICE YOUR PROGRESS</span><h1>Look how far <span>you've come.</span></h1><p>Progress isn't always loud. Sometimes it's just showing up.</p></div><div className="insight-grid"><div className="panel insight-card"><span className="soft-icon"><Target size={19}/></span><span className="section-kicker">TASK COMPLETION</span><div className="insight-number">{progress}%</div><div className="progress-track"><span style={{width:`${progress}%`}}/></div><p>{completed} completed out of {tasks.length} tasks.</p></div><div className="panel insight-card"><span className="soft-icon"><Flame size={19}/></span><span className="section-kicker">YOUR MOMENTUM</span><div className="insight-number">{completed}<small> wins</small></div><p>Each completed task is a small promise kept to yourself.</p></div></div></div>}

        {page === "Projects" && <div className="page-content inner-page projects-page">
  <div className="page-intro projects-intro">
    <span className="section-kicker">YOUR BUILD UNIVERSE</span>
    <h1>Ideas become <span>real things.</span></h1>
    <p>Explore your AI, software, research, and hardware projects.</p>
  </div>
  <div className="project-feature-banner">
    <div><span className="project-eyebrow">FEATURED WORKSPACE</span><h2>ALEXA LIFE DESK</h2><p>Your productivity workspace for tasks, focus, insights, and an assistant interface.</p><span className="project-status">IN DEVELOPMENT</span></div>
    <img src="/images/alexa-life-desk.jpeg" alt="ALEXA LIFE DESK"/>
  </div>
  <div className="projects-section-heading"><div><span className="section-kicker">PROJECT COLLECTION</span><h2>Explore your work</h2></div><span className="project-count">8 PROJECTS</span></div>
  <div className="project-card-grid">
    <details className="project-card project-violet"><summary><img src="/images/life-desk-workspace.png" alt="VISUALIQ-TV" loading="lazy"/><span className="project-card-content"><span className="project-card-tag">AI | COMMERCE</span><strong>VISUALIQ-TV</strong><span>Product intelligence with a smart-TV-inspired dashboard.</span><span className="project-expand">View details </span></span></summary><p>Product analysis, comparisons, decision support, trust, and price what-if workflows.</p></details>
    <details className="project-card project-blue"><summary><img src="/images/life-desk-ai-assistant.png" alt="JARVIS-X" loading="lazy"/><span className="project-card-content"><span className="project-card-tag">VOICE | AI</span><strong>JARVIS-X</strong><span>A voice-first personal assistant concept.</span><span className="project-expand">View details </span></span></summary><p>Planned multilingual interaction includes Kannada, English, Hindi, and mixed language.</p></details>
    <details className="project-card project-cyan"><summary><img src="/images/life-desk-analytics.png" alt="NEXUS" loading="lazy"/><span className="project-card-content"><span className="project-card-tag">AI | SAFETY</span><strong>NEXUS</strong><span>AI integration with safety gates.</span><span className="project-expand">View details </span></span></summary><p>Next.js application with Nemotron integration and safety-oriented design.</p></details>
    <details className="project-card project-orange"><summary><img src="/images/life-desk-hero.png" alt="ASTRAFORGE-X" loading="lazy"/><span className="project-card-content"><span className="project-card-tag">SPACE | RESEARCH</span><strong>ASTRAFORGE-X</strong><span>Space-focused project.</span><span className="project-expand">View details </span></span></summary><p>Project associated with NASA Space Apps 2026.</p></details>
    <details className="project-card project-pink"><summary><img src="/images/life-desk-focus.png" alt="SENTINEL-X" loading="lazy"/><span className="project-card-content"><span className="project-card-tag">ENGINEERING</span><strong>SENTINEL-X</strong><span>An engineering project with a broad capability roadmap.</span><span className="project-expand">View details </span></span></summary><p>Capability roadmap; individual capabilities require implementation verification.</p></details>
    <details className="project-card project-green"><summary><img src="/images/life-desk-analytics.png" alt="NOVA-X Research" loading="lazy"/><span className="project-card-content"><span className="project-card-tag">SPORTS | DATA</span><strong>NOVA-X Research</strong><span>Research for NFL Big Data Bowl 2027.</span><span className="project-expand">View details </span></span></summary><p>Reproducible experiments and condition-based research records.</p></details>
    <details className="project-card project-indigo"><summary><img src="/images/life-desk-workspace.png" alt="CIRCUIT-TRACE X" loading="lazy"/><span className="project-card-content"><span className="project-card-tag">HARDWARE + SOFTWARE</span><strong>CIRCUIT-TRACE X</strong><span>A hardware-and-software engineering project.</span><span className="project-expand">View details </span></span></summary><p>Designed as a combined physical hardware and software engineering system.</p></details>
    <details className="project-card project-gold"><summary><img src="/images/life-desk-cover.png" alt="Life Desk Workspace" loading="lazy"/><span className="project-card-content"><span className="project-card-tag">PRODUCTIVITY | WEB</span><strong>Life Desk Workspace</strong><span>The productivity dashboard itself.</span><span className="project-expand">View details </span></span></summary><p>React and Vite interface with tasks, focus timer, insights, settings, and assistant.</p></details>
  </div>
  <div className="project-footer-note"><Sparkles size={18}/><p>Build consistently. Verify every feature. Let the work speak for itself.</p></div>
</div>}
        {page === "Settings" && <div className="page-content inner-page">
          <div className="page-intro">
            <span className="section-kicker">MAKE THIS SPACE YOURS</span>
            <h1>Your space, <span>your way.</span></h1>
            <p>Simple controls for your Life Desk workspace.</p>
          </div>
          <div className="panel full-panel settings-panel">
            <div className="panel-heading"><h2>Workspace preferences</h2></div>
            <div className="task-row">
              <div className="task-info"><strong>Task summary</strong><span className="task-category">Tasks saved in this browser</span></div>
              <span className="priority priority-medium">{tasks.length} tasks</span>
            </div>
            <div className="task-row">
              <div className="task-info"><strong>Completed tasks</strong><span className="task-category">Your finished items</span></div>
              <span className="priority priority-low">{completed} completed</span>
            </div>
            <div className="task-row">
              <div className="task-info"><strong>Open tasks</strong><span className="task-category">Items still on your list</span></div>
              <span className="priority priority-high">{tasks.filter(t => !t.done).length} remaining</span>
            </div>
            <div className="panel-heading"><h2>Task management</h2></div>
            <p className="panel-description">You can remove completed tasks from your list. This action cannot be undone.</p>
            <button className="primary-button" disabled={!tasks.some(t => t.done)} onClick={() => {
              const count = tasks.filter(t => t.done).length;
              setTasks(prev => prev.filter(t => !t.done));
              notify(`${count} completed task${count === 1 ? "" : "s"} removed.`);
            }}>Clear completed tasks</button>
            <button className="text-action" onClick={() => setPage("Overview")}>Back to Overview</button>
          </div>
        </div>}
        <footer className="footer"><span>Made for a little more breathing room <span className="footer-heart">*</span></span><span>YOUR LIFE DESK <span className="footer-separator">|</span> ONE DAY AT A TIME</span></footer>
      </main>

      <aside className="assistant-sidebar"><div className="assistant-header"><div className="assistant-avatar"><Sparkles size={19}/></div><div><strong>Your little assistant</strong><small><span className="live-dot"/> HERE FOR YOU</small></div><span className="assistant-beta">BETA</span></div><div className="assistant-welcome"><span className="assistant-sparkle">*</span><strong>A little help goes a long way.</strong><p>Let's make today feel a little lighter.</p></div><div className="suggestion-label">A PLACE TO START</div><div className="suggestions"><button onClick={()=>respond("plan my day")}><CalendarDays size={16}/><span>Help me plan my day</span><ChevronRight size={15}/></button><button onClick={()=>respond("next priority")}><Target size={16}/><span>What should I do next?</span><ChevronRight size={15}/></button><button onClick={()=>respond("my progress")}><ChartNoAxesCombined size={16}/><span>Show my progress</span><ChevronRight size={15}/></button></div><div className="chat-area">{messages.map((m,i)=><div key={i} className={`chat-message ${m.from==="you"?"user-message":""}`}><span className="chat-badge">{m.from==="you"?"YOU":"*"}</span>{m.from === "you" ? <p>{m.text}</p> : <div className="markdown-response"><ReactMarkdown>{m.text.replace(/\\([*_``#>-])/g, "$1")}</ReactMarkdown></div>}</div>)}</div><form className="chat-form" onSubmit={e=>{e.preventDefault();respond(input);}}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask me anything..." aria-label="Message assistant"/><button type="submit" aria-label="Send message" disabled={isSending || !input.trim()}><Send size={17}/></button></form><div className="assistant-disclaimer"><span className="disclaimer-dot"/> Live AI assistant - Google Gemini</div></aside>
      {toast && <div className="toast"><CircleCheck size={17}/>{toast}<button onClick={()=>setToast("")} aria-label="Dismiss"><X size={15}/></button></div>}
    </div>
  );
}

function TaskRow({task,onToggle}) {
  return <div className={`task-row ${task.done?"task-done":""}`}><button className={`task-check ${task.done?"checked":""}`} aria-label={task.done?"Mark incomplete":"Mark complete"} onClick={()=>onToggle(task.id)}>{task.done&&<span>x</span>}</button><div className="task-info"><strong>{task.title}</strong><span className="task-time"><Clock3 size={12}/>{task.time}</span><span className="task-category">{task.category}</span></div><span className={`priority priority-${task.priority.toLowerCase()}`}>{task.priority}</span></div>;
}

export default App;
