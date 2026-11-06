"use client";

import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  HandHeart,
  Hammer,
  Leaf,
  LoaderCircle,
  Plus,
  Search,
  Shield,
  Sparkles,
  TentTree,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const categories = ["All tools", "Power tools", "Garden", "Kitchen", "Camping", "Home & repair", "Other"];
const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const dayAfterTomorrow = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
const categoryColors: Record<string, string> = {
  "Power tools": "lilac",
  Garden: "green",
  Kitchen: "peach",
  Camping: "blue",
  "Home & repair": "yellow",
  Other: "mint",
};
type PublicTool = { _id?: string; name: string; category: string };

type ToolFormValue = {
  _id?: Id<"tools">;
  name: string;
  category: string;
  condition: string;
  description: string;
};

function UnconfiguredPage({ tools, loading = false, signInEnabled = false }: { tools?: PublicTool[]; loading?: boolean; signInEnabled?: boolean }) {
  return (
    <main className="landing">
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark"><Wrench size={17} /></span>lendloop<span className="brand-dot">.</span></a>
        <nav className="top-links"><a href="#how-it-works">How it works</a><a href="#community">Our community</a></nav>
        {signInEnabled ? <SignInButton mode="modal"><button className="button button-dark button-small">Sign in to lend or borrow <ArrowRight size={15} /></button></SignInButton> : <a className="button button-dark button-small" href="#setup">Sign in to lend or borrow <ArrowRight size={15} /></a>}
      </header>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="live-dot" /> THE NEIGHBORHOOD TOOL LIBRARY</div>
          <h1>Borrow what you need.<br /><span>Lend what you don’t.</span></h1>
          <p>Good tools deserve a good life. Find what you need nearby, lend what you have, and make something wonderful together.</p>
          <div className="hero-actions"><a className="button button-green" href="#tools">Explore the tool board <ArrowRight size={17} /></a><a className="text-button" href="#how-it-works">How LendLoop works <ArrowDownRight size={16} /></a></div>
          <div className="social-proof"><div className="avatar-stack"><span>M</span><span>J</span><span>A</span><span>K</span></div><div><strong>Good neighbors, sharing more.</strong><small>One small borrow can make a big difference.</small></div></div>
        </div>
        <div className="hero-art">
          <div className="sun-shape" />
          <div className="floating-note note-top"><span className="note-icon note-lilac"><Hammer size={19} /></span><span><b>Need a drill?</b><small>There’s one around the corner.</small></span><ArrowUpRight size={17} /></div>
          <div className="tool-illustration"><div className="tool-handle" /><div className="tool-body"><div className="tool-grip" /><div className="tool-head" /><div className="tool-bit" /><div className="tool-light" /></div><div className="tool-shadow" /></div>
          <div className="floating-note note-bottom"><span className="note-icon note-green"><HandHeart size={20} /></span><span><b>Better together</b><small>Sharing is a neighborhood thing.</small></span><span className="tiny-heart">♥</span></div>
          <div className="sparkle sparkle-a">✳</div><div className="sparkle sparkle-b">✳</div><div className="hero-label">SHARE A LITTLE. BUILD A LOT.</div>
        </div>
      </section>
      <section className="board-section" id="tools">
        <div className="section-heading"><div><div className="eyebrow">A LITTLE CLOSER THAN YOU THINK</div><h2>The neighborhood board<span>.</span></h2></div><div className="board-count"><span className="live-dot" /> A peek at what’s being shared</div></div>
        <div className="tool-grid">
          {tools?.map((tool, i) => <article className="public-tool-card" key={tool._id ?? `${tool.name}-${i}`}><div className={`tool-photo ${categoryColors[tool.category] ?? "mint"}`}><span className="tool-emoji">{tool.category === "Garden" ? <Leaf size={42} /> : tool.category === "Camping" ? <TentTree size={42} /> : <Wrench size={42} />}</span><span className="available-pill"><i /> Available</span><span className="tool-number">{String(i + 1).padStart(2, "0")}</span></div><div className="tool-card-copy"><div><span className="category-label">{tool.category}</span><h3>{tool.name}</h3></div>{signInEnabled ? <SignInButton mode="modal"><button className="circle-arrow" aria-label={`Sign in to request ${tool.name}`}><ArrowUpRight size={18} /></button></SignInButton> : <button className="circle-arrow" aria-label="Sign in to request this tool"><ArrowUpRight size={18} /></button>}</div></article>)}
        </div>
        {!tools && loading && <div className="public-empty">Loading the neighborhood board…</div>}
        {!tools && !loading && <div className="public-empty">Connect Convex to load tools listed by your neighbors.</div>}
        {tools && tools.length === 0 && <div className="public-empty">No tools are listed yet. Be the first neighbor to share one.</div>}
        <div className="public-privacy"><Shield size={16} /><span>Public board, private neighbors. Sign in to see details and make a request.</span></div>
      </section>
      <section className="how-section" id="how-it-works">
        <div className="how-title"><div className="eyebrow">SIMPLE AS PASSING IT ON</div><h2>Good things go<br />around<span>.</span></h2></div>
        <div className="steps"><div className="step"><span>01</span><div className="step-icon"><Search size={20} /></div><h3>Find your thing</h3><p>Browse what neighbors are sharing. That ladder you need is probably closer than the hardware store.</p></div><div className="step"><span>02</span><div className="step-icon"><CalendarDays size={20} /></div><h3>Ask for a borrow</h3><p>Pick your dates and send a quick request. Your neighbor will let you know.</p></div><div className="step"><span>03</span><div className="step-icon"><HandHeart size={20} /></div><h3>Pass it on</h3><p>Pick it up, get the job done, and return it ready for the next good thing.</p></div></div>
      </section>
      <section className="bottom-cta" id="community"><div><div className="eyebrow">A GOOD THING STARTS NEXT DOOR</div><h2>Your toolbox is bigger<br />than you think.</h2><p>Join the neighbors making more with what’s already around.</p></div>{signInEnabled ? <SignInButton mode="modal"><button className="button button-dark">Sign in to lend or borrow <ArrowRight size={17} /></button></SignInButton> : <a className="button button-dark" href="#setup">Sign in to lend or borrow <ArrowRight size={17} /></a>}<span className="cta-flower">✳</span></section>
      <footer className="footer"><a className="brand" href="#"><span className="brand-mark"><Wrench size={16} /></span>lendloop<span className="brand-dot">.</span></a><span>Made for borrowing a little more, together.</span><span>© 2026 LendLoop</span></footer>
      {!signInEnabled && <div className="setup-notice" id="setup"><CircleHelp size={17} /><span>Connect your Clerk and Convex keys in <code>.env.local</code> to sign in and use your neighborhood board.</span></div>}
    </main>
  );
}

function ToolDialog({ initial, onClose, onSave }: {
  initial?: ToolFormValue;
  onClose: () => void;
  onSave: (value: ToolFormValue) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await onSave({
        _id: initial?._id,
        name: String(form.get("name")),
        category: String(form.get("category")),
        condition: String(form.get("condition")),
        description: String(form.get("description")),
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your listing.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form className="dialog" onSubmit={submit}><div className="dialog-head"><div><div className="eyebrow">{initial ? "MAKE A CHANGE" : "ADD TO THE TOOLSHED"}</div><h2>{initial ? "Edit your listing" : "List a tool"}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={20} /></button></div><label>Tool name<input autoFocus name="name" required maxLength={80} placeholder="e.g. Cordless drill" defaultValue={initial?.name} /></label><div className="form-row"><label>Category<select name="category" defaultValue={initial?.category ?? "Power tools"}>{categories.slice(1).map((category) => <option key={category}>{category}</option>)}</select></label><label>Condition<select name="condition" defaultValue={initial?.condition ?? "Good"}><option>Like new</option><option>Good</option><option>Well loved</option></select></label></div><label>A little about it<textarea name="description" rows={3} required maxLength={280} placeholder="Anything a neighbor should know before borrowing?" defaultValue={initial?.description} /></label>{error && <div className="form-error">{error}</div>}<div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="button button-green" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}{initial ? "Save changes" : "List this tool"}</button></div></form></div>;
}

function RequestDialog({ tool, onClose, onRequest }: { tool: { _id: Id<"tools">; name: string }; onClose: () => void; onRequest: (toolId: Id<"tools">, startDate: string, endDate: string) => Promise<void> }) {
  const [startDate, setStartDate] = useState(tomorrow);
  const [endDate, setEndDate] = useState(dayAfterTomorrow);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await onRequest(tool._id, startDate, endDate);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send this request.");
    } finally {
      setBusy(false);
    }
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form className="dialog" onSubmit={submit}><div className="dialog-head"><div><div className="eyebrow">BORROW FROM A NEIGHBOR</div><h2>Request {tool.name}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={20} /></button></div><p className="dialog-copy">Choose the dates you need it. The lender will get back to you.</p><div className="form-row"><label>Pick-up date<input type="date" name="startDate" min={tomorrow} required value={startDate} onChange={(event) => { const next = event.target.value; setStartDate(next); if (next) { const minimumEnd = new Date(Date.parse(`${next}T00:00:00.000Z`) + 86400000).toISOString().slice(0, 10); if (endDate < minimumEnd) setEndDate(minimumEnd); } }} /></label><label>Return by<input type="date" name="endDate" min={startDate ? new Date(Date.parse(`${startDate}T00:00:00.000Z`) + 86400000).toISOString().slice(0, 10) : dayAfterTomorrow} required value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div>{error && <div className="form-error">{error}</div>}<div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button type="submit" className="button button-green" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : <ArrowRight size={17} />}Send request</button></div></form></div>;
}

function Dashboard() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [category, setCategory] = useState("All tools");
  const [view, setView] = useState("All tools");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<ToolFormValue | "new" | null>(null);
  const [requestTool, setRequestTool] = useState<{ _id: Id<"tools">; name: string } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const memberData = useQuery(api.tools.allForMember, isSignedIn ? {} : "skip");
  const syncProfile = useMutation(api.tools.syncProfile);
  const createTool = useMutation(api.tools.create);
  const updateTool = useMutation(api.tools.update);
  const removeTool = useMutation(api.tools.remove);
  const requestBorrow = useMutation(api.tools.requestBorrow);
  const updateRequest = useMutation(api.tools.updateRequestStatus);
  const markTrusted = useMutation(api.tools.markTrustedLender);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void syncProfile({}).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "Could not sync your verified account email.");
    });
  }, [isLoaded, isSignedIn, syncProfile]);

  const tools = memberData?.tools ?? [];
  const loans = memberData?.loans ?? [];
  const filtered = tools.filter((tool) =>
    (category === "All tools" || tool.category === category)
    && (tool.name.toLowerCase().includes(search.toLowerCase()) || tool.category.toLowerCase().includes(search.toLowerCase())),
  );

  async function saveTool(value: ToolFormValue) {
    if (value._id) await updateTool({ toolId: value._id, name: value.name, category: value.category, condition: value.condition, description: value.description });
    else await createTool({ name: value.name, category: value.category, condition: value.condition, description: value.description });
    setNotice(value._id ? "Your listing has been updated." : "Your tool is on the board.");
    setTimeout(() => setNotice(""), 3000);
  }

  async function handleRequest(toolId: Id<"tools">, startDate: string, endDate: string) {
    await requestBorrow({ toolId, startDate, endDate });
    setNotice("Request sent! The lender will hear about it.");
    setTimeout(() => setNotice(""), 3500);
  }

  async function handleStatus(loanId: Id<"loans">, status: "approved" | "declined" | "returned") {
    try {
      await updateRequest({ loanId, status });
      setNotice(status === "returned" ? "Marked as returned. Thanks for passing it on!" : `Request ${status}.`);
      setTimeout(() => setNotice(""), 3500);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update this request.");
    }
  }

  async function deleteTool(toolId: Id<"tools">) {
    if (!window.confirm("Remove this tool from the neighborhood board?")) return;
    try {
      await removeTool({ toolId });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove this listing.");
    }
  }

  async function toggleTrusted(clerkId: string, trusted: boolean) {
    try {
      await markTrusted({ clerkId, trusted });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update trusted-lender status.");
    }
  }

  return <main className="app-shell">
    <header className="app-topbar"><a className="brand" href="#"><span className="brand-mark"><Wrench size={17} /></span>lendloop<span className="brand-dot">.</span></a><div className="app-top-actions"><span className="neighborhood-label"><span className="live-dot" /> YOUR NEIGHBORHOOD TOOLSHED</span>{isLoaded && isSignedIn ? <UserButton /> : <SignInButton mode="modal"><button className="button button-dark button-small">Sign in <ArrowRight size={15} /></button></SignInButton>}</div></header>
    {!isLoaded ? <div className="loading-screen"><LoaderCircle className="spin" /> Getting your toolshed ready…</div> : <div className="app-content">
      <section className="app-welcome"><div><div className="eyebrow">GOOD TO SEE YOU HERE</div><h1>Hey{user?.firstName ? `, ${user.firstName}` : " neighbor"}<span>.</span></h1><p>There’s always something good going around.</p></div><div className="welcome-illustration"><span>✳</span><HandHeart size={36} /></div></section>
      {!isSignedIn ? <section className="signed-out-card"><div className="signed-out-icon"><Wrench size={23} /></div><div><h2>Your neighborhood toolshed is waiting.</h2><p>Sign in to borrow a tool, share one of yours, and keep up with your requests.</p></div><SignInButton mode="modal"><button className="button button-green">Sign in to lend or borrow <ArrowRight size={17} /></button></SignInButton></section> : <>
        <section className="stat-row">
          <div className="stat-card"><span className="stat-icon green-soft"><Wrench size={18} /></span><span><b>{tools.length}</b><small>tools on the board</small></span></div>
          <div className="stat-card"><span className="stat-icon lilac-soft"><CalendarDays size={18} /></span><span><b>{loans.filter((loan) => loan.lenderId === user?.id && loan.status === "requested").length}</b><small>pending requests</small></span></div>
          <div className="stat-card"><span className="stat-icon blue-soft"><ArrowDownRight size={18} /></span><span><b>{loans.filter((loan) => loan.borrowerId === user?.id && loan.status === "approved").length}</b><small>borrowing</small></span></div>
          <div className="stat-card"><span className="stat-icon peach-soft"><ArrowUpRight size={18} /></span><span><b>{loans.filter((loan) => loan.lenderId === user?.id && loan.status === "approved").length}</b><small>lent out</small></span></div>
        </section>
        <div className="workspace">
          <aside className="side-nav"><div className="side-label">YOUR TOOLSHED</div>{["All tools", "My listings", "My requests", "Incoming requests"].map((item) => <button key={item} className={`nav-item ${view === item ? "active" : ""}`} onClick={() => setView(item)}>{item === "All tools" ? <Search size={17} /> : item === "My listings" ? <Wrench size={17} /> : item === "My requests" ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />}<span>{item}</span>{item === "Incoming requests" && loans.filter((loan) => loan.lenderId === user?.id && loan.status === "requested").length > 0 && <b className="nav-count">{loans.filter((loan) => loan.lenderId === user?.id && loan.status === "requested").length}</b>}</button>)}{memberData?.isAdmin && <><div className="side-label admin-label">ADMIN</div><button className={`nav-item ${view === "All loans" ? "active" : ""}`} onClick={() => setView("All loans")}><Shield size={17} /><span>All loans</span></button></>}<div className="side-tip"><Sparkles size={16} /><p>A good neighbor returns things ready for the next project.</p><span>THE LENDLOOP WAY</span></div></aside>
          <section className="main-panel">
            {error && <div className="alert-error" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss error"><X size={15} /></button></div>}
            {notice && <div className="toast"><Check size={17} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notice"><X size={15} /></button></div>}
            {view === "All tools" || view === "My listings" ? <><div className="panel-heading"><div><div className="eyebrow">{view === "All tools" ? "PASS IT AROUND" : "YOUR SHARE OF THE SHEDDING"}</div><h2>{view === "All tools" ? "The tool board" : "My listings"}<span>.</span></h2></div><button className="button button-green button-small" onClick={() => setDialog("new")}><Plus size={16} />List a tool</button></div>{view === "All tools" && <div className="toolbar"><div className="search-field"><Search size={16} /><input placeholder="Find a tool or category" value={search} onChange={(event) => setSearch(event.target.value)} /><ChevronDown size={14} /></div><div className="category-scroll">{categories.map((item) => <button key={item} className={`category-chip ${category === item ? "selected" : ""}`} onClick={() => setCategory(item)}>{item}</button>)}</div></div>}{memberData ? <div className="dashboard-tool-grid">{filtered.filter((tool) => view !== "My listings" || tool.ownerId === user?.id).map((tool) => {
                const isOwner = tool.ownerId === user?.id;
                const approvedLoan = loans.find((loan) => loan.toolId === tool._id && loan.status === "approved");
                const active = approvedLoan !== undefined && approvedLoan.startDate <= today && approvedLoan.endDate >= today;
                const overdue = approvedLoan !== undefined && approvedLoan.endDate < today;
                const ownRequest = loans.find((loan) => loan.toolId === tool._id && loan.borrowerId === user?.id && loan.status === "approved")
                  ?? loans.find((loan) => loan.toolId === tool._id && loan.borrowerId === user?.id && loan.status === "requested");
                const incomingRequest = loans.find((loan) => loan.toolId === tool._id && loan.lenderId === user?.id && loan.status === "requested");
                const availability = ownRequest?.status === "approved"
                  ? active ? "On loan" : overdue ? "Overdue" : "Reserved for you"
                  : ownRequest ? "Request pending"
                    : active ? "On loan" : overdue ? "Overdue" : approvedLoan ? "Reserved" : incomingRequest ? "Request pending" : "Available";
                const availabilityClass = active || overdue ? "busy" : approvedLoan || ownRequest || incomingRequest ? "reserved" : "";
                return <article className="dashboard-tool" key={tool._id}><div className={`dashboard-tool-picture ${tool.category === "Garden" ? "green" : tool.category === "Kitchen" ? "peach" : tool.category === "Camping" ? "blue" : "lilac"}`}><span>{tool.category === "Garden" ? <Leaf size={31} /> : tool.category === "Camping" ? <TentTree size={31} /> : <Wrench size={31} />}</span><span className={`availability ${availabilityClass}`}><i />{availability}</span></div><div className="dashboard-tool-copy"><div className="category-label">{tool.category}</div><h3>{tool.name}</h3><div className="tool-meta"><span>{tool.condition}</span><span>·</span><span>{isOwner ? "Your listing" : `From ${tool.ownerName}`}</span></div>{tool.description && <p className="tool-description">{tool.description}</p>}{tool.trustedLender && <span className="trusted-tag"><BadgeCheck size={13} /> Trusted lender</span>}<div className="tool-actions">{isOwner ? <><button className="button button-quiet button-small" onClick={() => setDialog({ _id: tool._id, name: tool.name, category: tool.category, condition: tool.condition, description: tool.description })}>Edit</button><button className="icon-button subtle-danger" onClick={() => deleteTool(tool._id)} aria-label="Delete listing"><Trash2 size={16} /></button></> : ownRequest ? <button className="button button-quiet button-small" onClick={() => setView("My requests")}>View request <ArrowRight size={14} /></button> : <button className="button button-green button-small" onClick={() => setRequestTool({ _id: tool._id, name: tool.name })}>Request to borrow <ArrowRight size={14} /></button>}{memberData.isAdmin && !isOwner && <><button className="icon-button subtle-danger" onClick={() => deleteTool(tool._id)} aria-label="Admin remove listing"><Trash2 size={16} /></button><button className="trusted-toggle" onClick={() => toggleTrusted(tool.ownerId, !tool.trustedLender)}>{tool.trustedLender ? "Untrust" : <><BadgeCheck size={14} /> Trust</>}</button></>}</div></div></article>;
              })}{filtered.filter((tool) => view !== "My listings" || tool.ownerId === user?.id).length === 0 && <div className="empty-state"><div><Wrench size={22} /></div><h3>{view === "My listings" ? "Your toolbox is ready to share." : "Nothing on this shelf just yet."}</h3><p>{view === "My listings" ? "List your first tool and help a neighbor with their next project." : "Try another category or check back soon."}</p>{view === "My listings" && <button className="button button-green button-small" onClick={() => setDialog("new")}><Plus size={16} />List a tool</button>}</div>}</div> : <div className="loading-inline"><LoaderCircle className="spin" />Loading the board…</div>}</> : <LoanView view={view} loans={loans} userId={user?.id ?? ""} isAdmin={memberData?.isAdmin ?? false} onStatus={handleStatus} />}
          </section>
        </div>
        <div className="privacy-foot"><Shield size={15} /><span>Only you and the people involved in a borrow see request details.</span></div>
      </>}
    </div>}
    <footer className="app-footer"><a className="brand" href="#"><span className="brand-mark"><Wrench size={15} /></span>lendloop<span className="brand-dot">.</span></a><span>Good things go around.</span><span>© 2025 LendLoop</span></footer>
    {dialog && <ToolDialog initial={dialog === "new" ? undefined : dialog} onClose={() => setDialog(null)} onSave={saveTool} />}
    {requestTool && <RequestDialog tool={requestTool} onClose={() => setRequestTool(null)} onRequest={handleRequest} />}
  </main>;
}

function LoanView({ view, loans, userId, isAdmin, onStatus }: {
  view: string;
  loans: Array<{
    _id: Id<"loans">;
    toolId: Id<"tools">;
    lenderId: string;
    borrowerId: string;
    borrowerName: string;
    startDate: string;
    endDate: string;
    status: "requested" | "approved" | "declined" | "returned";
    tool: { name: string; category: string } | null;
    activity: Array<{ sentAt: number }>;
  }>;
  userId: string;
  isAdmin: boolean;
  onStatus: (loanId: Id<"loans">, status: "approved" | "declined" | "returned") => void;
}) {
  const shown = view === "My requests" ? loans.filter((loan) => loan.borrowerId === userId)
    : view === "Incoming requests" ? loans.filter((loan) => loan.lenderId === userId)
      : isAdmin ? loans : [];
  const heading = view === "My requests" ? "My requests" : view === "Incoming requests" ? "Incoming requests" : "All loans";
  return <><div className="panel-heading"><div><div className="eyebrow">{view === "Incoming requests" ? "YOUR NEIGHBORS ARE ASKING" : "KEEP THINGS GOING AROUND"}</div><h2>{heading}<span>.</span></h2></div></div><div className="loan-list">{shown.length ? shown.map((loan) => <article className="loan-card" key={loan._id}><div className="loan-icon"><Wrench size={20} /></div><div className="loan-content"><div className="loan-title-row"><h3>{loan.tool?.name ?? "Removed tool"}</h3><span className={`status-tag ${loan.status}`}>{loan.status}</span></div><p>{view === "My requests" ? `Requested from ${loan.lenderId === userId ? "you" : "a neighbor"}` : `Requested by ${loan.borrowerName}`} · {loan.startDate} – {loan.endDate}</p><div className="loan-activity"><Clock3 size={13} />{loan.activity.length ? `Reminder sent · ${new Date(loan.activity[0].sentAt).toLocaleDateString()}` : loan.status === "requested" ? "Waiting for a neighbor to reply" : "No reminders yet"}</div></div><div className="loan-actions">{view === "Incoming requests" && loan.status === "requested" && <><button className="button button-quiet button-small" onClick={() => onStatus(loan._id, "declined")}>Decline</button><button className="button button-green button-small" onClick={() => onStatus(loan._id, "approved")}><Check size={14} />Approve</button></>}{loan.status === "approved" && (loan.borrowerId === userId || loan.lenderId === userId || isAdmin) && <button className="button button-green button-small" onClick={() => onStatus(loan._id, "returned")}>Mark returned</button>}</div></article>) : <div className="empty-state"><div><HandHeart size={22} /></div><h3>Nothing to see here yet.</h3><p>Requests will show up here when a neighbor needs a tool.</p></div>}</div></>;
}

export default function AppClient() {
  const convexConfigured = Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  if (convexConfigured && clerkConfigured) return <ClerkApp />;
  if (convexConfigured) return <ConnectedPublicBoard />;
  return <UnconfiguredPage />;
}

function ClerkApp() {
  const { isLoaded, isSignedIn } = useUser();
  const tools = useQuery(api.tools.publicAvailable, {});
  if (!isLoaded) return <div className="loading-screen"><LoaderCircle className="spin" /> Getting your toolshed ready…</div>;
  if (isSignedIn) return <Dashboard />;
  return <UnconfiguredPage tools={tools} loading={tools === undefined} signInEnabled />;
}

function ConnectedPublicBoard() {
  const tools = useQuery(api.tools.publicAvailable, {});
  return <UnconfiguredPage tools={tools} loading={tools === undefined} />;
}
