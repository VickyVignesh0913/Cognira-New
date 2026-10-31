import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Shell } from '@/components/ui'
import { loadProfile, loadResources, saveResources, uid, type Resource } from '@/lib/cognira'
import { uploadResourceFile } from '@/server/cognira'

export const Route = createFileRoute('/library')({ component: L })

function L() {
  const profile = loadProfile()
  const student = profile?.persona !== 'professional'
  const [items, setItems] = useState<Resource[]>(loadResources)
  const [q, setQ] = useState('')
  const [chip, setChip] = useState('All')
  const [open, setOpen] = useState(false)
  const chips = student ? ['All', 'Subjects', 'Notes', 'PYQs', 'Mock Tests'] : ['All', 'Documents', 'Templates', 'Articles', 'Links']
  const filtered = useMemo(() => items.filter((r) => (chip === 'All' || r.category === chip) && (!q || r.title.toLowerCase().includes(q.toLowerCase()))), [items, chip, q])
  function persist(v: Resource[]) { setItems(v); saveResources(v) }
  const cats = useMemo(() => { const m = new Map<string, number>(); items.forEach((r) => m.set(r.category, (m.get(r.category) || 0) + 1)); return [...m.entries()] }, [items])

  return (
    <Shell title={student ? 'StudyHouse' : 'Resources'}>
      <h1 className="font-display text-3xl">{student ? 'STUDYHOUSE' : 'RESOURCES'}</h1>
      <input className="in" placeholder="Search files…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search files" />
      <div className="flex flex-wrap gap-2">{chips.map((c) => <button key={c} className={`chip ${chip === c ? 'on' : ''}`} onClick={() => setChip(c)}>{c}</button>)}</div>
      <div className="brutal-card"><b>CATEGORIES</b>{cats.length === 0 && <div className="font-mono2 text-xs">Nothing here yet.</div>}{cats.map(([n, c]) => <div key={n} className="flex items-center justify-between border-t-2 border-black py-1 text-sm"><span>📁 {n}</span><span className="font-mono2 text-xs">{c} ›</span></div>)}</div>
      <div className="grid grid-cols-2 gap-2">{['My Notes', 'PYQs', 'Mock Tests', 'Bookmarks'].map((t) => <button key={t} className="brutal-card text-left font-bold" onClick={() => setChip(t === 'My Notes' ? 'Notes' : t === 'Bookmarks' ? 'All' : t)}>⭐ {t}</button>)}</div>
      <div className="brutal-card"><div className="flex items-center justify-between"><b>RECENT FILES</b><button className="brutal-btn" onClick={() => setOpen(true)}>+ Add</button></div>
        {filtered.length === 0 && <div className="mt-1 font-mono2 text-xs">{items.length === 0 ? 'Nothing saved yet — add a PDF link or note above.' : 'No files match your search.'}</div>}
        {filtered.map((r) => <FileRow key={r.id} r={r} del={() => persist(items.filter((x) => x.id !== r.id))} ren={(t: string) => persist(items.map((x) => x.id === r.id ? { ...x, title: t } : x))} />)}
      </div>
      {open && <Add close={() => setOpen(false)} add={(r: Resource) => { persist([r, ...items]); setQ(''); setChip('All'); setOpen(false) }} />}
    </Shell>
  )
}

function rel(iso: string) { const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); if (m < 60) return `${m}m ago`; const h = Math.round(m / 60); if (h < 24) return `${h}h ago`; return `${Math.round(h / 24)}d ago` }
function FileRow({ r, del, ren }: { r: Resource; del: () => void; ren: (t: string) => void }) {
  const [menu, setMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [v, setV] = useState(r.title)
  function commit() {
    const t = v.trim()
    if (t) ren(t)
    setEditing(false)
  }
  return (
    <div className="flex items-center gap-2 border-t-2 border-black py-2">
      <span className="brutal-card px-2 py-1">{r.type === 'link' ? '🔗' : '📄'}</span>
      <div className="min-w-0 flex-1">{editing ? <input className="in" value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setV(r.title); setEditing(false) } }} autoFocus /> : <a href={r.url} target="_blank" rel="noreferrer" className="block truncate text-sm font-bold underline">{r.title}</a>}<div className="font-mono2 text-[11px]">{r.category} · {rel(r.updatedAt)}</div></div>
      <button aria-label="file options" className="btn-ghost" onClick={() => setMenu(!menu)}>⋯</button>
      {menu && <div className="flex gap-1"><button className="chip" onClick={() => { setEditing(true); setMenu(false) }}>Rename</button><button className="chip" onClick={del}>Delete</button></div>}
    </div>
  )
}

function Add({ close, add }: { close: () => void; add: (r: Resource) => void }) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [cat, setCat] = useState('Notes')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  async function onFile(f: File | undefined) {
    if (!f) return
    setErr('')
    const name = title.trim() || f.name.replace(/\.[^.]+$/, '')
    if (f.size > 8 * 1024 * 1024) { setErr('That file is over 8 MB — pick a smaller PDF.'); return }
    setBusy(true)
    try {
      try {
        const fd = new FormData()
        fd.append('file', f)
        const r: any = await uploadResourceFile({ data: fd })
        const url = String(r?.url || '')
        if (url) { add({ id: uid(), title: name, type: f.type.includes('pdf') ? 'pdf' : 'file', category: cat, url, updatedAt: new Date().toISOString() }); return }
      } catch { /* not signed in — fall through to on-device copy */ }
      const dataUrl: string = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(f) })
      add({ id: uid(), title: name, type: f.type.includes('pdf') ? 'pdf' : 'file', category: cat, url: dataUrl, updatedAt: new Date().toISOString() })
    } catch { setErr('Could not read that file — try again.') }
    finally { setBusy(false) }
  }
  return (
    <div className="sheet-back" onClick={close}><div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Add resource">
      <b>ADD RESOURCE</b>
      <label className="lbl">Title<input className="in" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Maths formulas PDF" /></label>
      <label className="lbl">Upload PDF from this device<input className="in" type="file" accept="application/pdf,.pdf,image/*,.txt" onChange={(e) => onFile(e.target.files?.[0])} aria-label="Upload a file" /></label>
      <label className="lbl">Or save a link<input className="in" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" inputMode="url" /></label>
      <div className="lbl">Category<div className="flex flex-wrap gap-2">{['Notes', 'PYQs', 'Mock Tests', 'Subjects', 'Documents', 'Templates', 'Articles', 'Links'].map((c) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}</div></div>
      {err && <div role="alert" className="text-sm font-bold">{err}</div>}
      <div className="flex gap-2"><button className="brutal-btn flex-1" onClick={() => { if (!title.trim()) { setErr('Add a title first.'); return } if (!/^https?:\/\/.+/.test(url.trim())) { setErr('Paste a full link starting with https://'); return } add({ id: uid(), title: title.trim(), type: 'link', category: cat, url: url.trim(), updatedAt: new Date().toISOString() }) }}>Save</button><button className="btn-ghost" onClick={close}>Cancel</button></div>
      <p className="font-mono2 text-[11px]">PDFs stay saved on this device and open any time. Signed-in uploads use secure file storage when available.</p>
    </div></div>
  )
}
