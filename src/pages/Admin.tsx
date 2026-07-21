import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import styles from "./Admin.module.scss";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Layers, Layout, Home, Server, Plus, Edit3, Trash2, Copy, Eye, RefreshCw,
  Trash, KeyRound, Database, Shield, Search,
} from "lucide-react";
import {
  getTemplateVariations, saveTemplateVariation, deleteTemplateVariation, type TemplateVariation,
  getHeaderFooters, saveHeaderFooter, deleteHeaderFooter, type HeaderFooter,
  getHeroMetadata, saveHeroMetadata,
  getBearerToken, fetchCacheRegions, type CacheRegion,
} from "@/lib/adminStorage";

const uid = () => Math.random().toString(36).slice(2, 10);

const Admin = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "variations";

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pageHeader}>
          <h1>Admin Console</h1>
          <p>Manage template variations, layouts, homepage metadata and runtime operations.</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
            <TabsTrigger value="variations" className="gap-2"><Layers className="h-4 w-4" />Template Variations</TabsTrigger>
            <TabsTrigger value="headerfooter" className="gap-2"><Layout className="h-4 w-4" />Header &amp; Footer</TabsTrigger>
            <TabsTrigger value="hero" className="gap-2"><Home className="h-4 w-4" />Hero Metadata</TabsTrigger>
            <TabsTrigger value="ops" className="gap-2"><Server className="h-4 w-4" />Operations</TabsTrigger>
          </TabsList>

          <TabsContent value="variations"><VariationsTab /></TabsContent>
          <TabsContent value="headerfooter"><HeaderFooterTab /></TabsContent>
          <TabsContent value="hero"><HeroTab /></TabsContent>
          <TabsContent value="ops"><OperationsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

/* ==================== Template Variations ==================== */
function VariationsTab() {
  const { toast } = useToast();
  const [items, setItems] = useState<TemplateVariation[]>([]);
  const [hfs, setHfs] = useState<HeaderFooter[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<TemplateVariation | null>(null);
  const [open, setOpen] = useState(false);

  const reload = () => { setItems(getTemplateVariations()); setHfs(getHeaderFooters()); };
  useEffect(reload, []);

  const filtered = useMemo(() => items.filter(i =>
    !query || i.name.toLowerCase().includes(query.toLowerCase()) || i.code.toLowerCase().includes(query.toLowerCase())
  ), [items, query]);

  const openNew = () => {
    setEditing({ id: uid(), code: "", name: "", description: "", status: "draft", updatedAt: new Date().toISOString() });
    setOpen(true);
  };
  const openEdit = (v: TemplateVariation) => { setEditing({ ...v }); setOpen(true); };
  const save = () => {
    if (!editing) return;
    if (!editing.code.trim() || !editing.name.trim()) {
      toast({ title: "Missing fields", description: "Code and name are required.", variant: "destructive" });
      return;
    }
    saveTemplateVariation({ ...editing, updatedAt: new Date().toISOString() });
    toast({ title: "Saved", description: `Variation "${editing.name}" saved.` });
    setOpen(false); reload();
  };
  const remove = (v: TemplateVariation) => {
    deleteTemplateVariation(v.id);
    toast({ title: "Deleted", description: `"${v.name}" removed.` });
    reload();
  };

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionTitleRow}>
        <div>
          <h2>Template Variations</h2>
          <p>Onboard reusable template variations and link them to header &amp; footer layouts.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…" className="pl-8 w-56" />
          </div>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New Variation</Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}>No variations yet. Create your first one.</div>
      ) : (
        <div className={styles.rowList}>
          {filtered.map(v => {
            const hf = hfs.find(h => h.id === v.headerFooterId);
            return (
              <div key={v.id} className={styles.row}>
                <div className={styles.rowMain}>
                  <div className={styles.rowTitle}>
                    {v.name}
                    <Badge variant="outline" className="font-mono text-[0.7rem]">{v.code}</Badge>
                    <Badge variant={v.status === "active" ? "default" : v.status === "draft" ? "secondary" : "outline"}>
                      {v.status}
                    </Badge>
                  </div>
                  <div className={styles.rowMeta}>
                    {v.description || "No description"} · Layout: {hf?.name ?? "—"} · Updated {new Date(v.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className={styles.rowActions}>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(v)}><Edit3 className="h-4 w-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete variation?</AlertDialogTitle>
                        <AlertDialogDescription>This will remove "{v.name}". This cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(v)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing && items.find(i => i.id === editing.id) ? "Edit Variation" : "New Variation"}</DialogTitle>
            <DialogDescription>Define a reusable template variation.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Code</Label>
                  <Input value={editing.code} onChange={e => setEditing({ ...editing, code: e.target.value.toUpperCase() })} placeholder="STD-EMAIL" />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v as TemplateVariation["status"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Name</Label>
                <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} rows={3} />
              </div>
              <div>
                <Label>Header &amp; Footer Layout</Label>
                <Select value={editing.headerFooterId ?? "none"} onValueChange={(v) => setEditing({ ...editing, headerFooterId: v === "none" ? undefined : v })}>
                  <SelectTrigger><SelectValue placeholder="Select layout" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {hfs.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ==================== Header & Footer ==================== */
function HeaderFooterTab() {
  const { toast } = useToast();
  const [items, setItems] = useState<HeaderFooter[]>([]);
  const [editing, setEditing] = useState<HeaderFooter | null>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<HeaderFooter | null>(null);

  const reload = () => setItems(getHeaderFooters());
  useEffect(reload, []);

  const openNew = () => {
    setEditing({ id: uid(), name: "", headerHtml: "", footerHtml: "", updatedAt: new Date().toISOString() });
    setOpen(true);
  };
  const openEdit = (v: HeaderFooter) => { setEditing({ ...v }); setOpen(true); };
  const save = () => {
    if (!editing) return;
    if (!editing.name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    saveHeaderFooter({ ...editing, updatedAt: new Date().toISOString() });
    toast({ title: "Saved", description: `"${editing.name}" saved.` });
    setOpen(false); reload();
  };
  const remove = (v: HeaderFooter) => { deleteHeaderFooter(v.id); toast({ title: "Deleted" }); reload(); };

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionTitleRow}>
        <div>
          <h2>Header &amp; Footer Layouts</h2>
          <p>Reusable email header/footer HTML. Assign these to template variations.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New Layout</Button>
      </div>

      {items.length === 0 ? (
        <div className={styles.emptyState}>No layouts yet.</div>
      ) : (
        <div className={styles.rowList}>
          {items.map(v => (
            <div key={v.id} className={styles.row}>
              <div className={styles.rowMain}>
                <div className={styles.rowTitle}>{v.name}</div>
                <div className={styles.rowMeta}>Updated {new Date(v.updatedAt).toLocaleString()}</div>
              </div>
              <div className={styles.rowActions}>
                <Button variant="ghost" size="icon" onClick={() => setPreview(v)}><Eye className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => openEdit(v)}><Edit3 className="h-4 w-4" /></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete layout?</AlertDialogTitle>
                      <AlertDialogDescription>Remove "{v.name}"?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove(v)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing && items.find(i => i.id === editing.id) ? "Edit Layout" : "New Layout"}</DialogTitle>
            <DialogDescription>HTML shown at the top and bottom of every email using this layout.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <Label>Header HTML</Label>
                <Textarea value={editing.headerHtml} onChange={e => setEditing({ ...editing, headerHtml: e.target.value })} rows={6} className="font-mono text-xs" />
                <div className={styles.htmlPreview} dangerouslySetInnerHTML={{ __html: editing.headerHtml }} />
              </div>
              <div>
                <Label>Footer HTML</Label>
                <Textarea value={editing.footerHtml} onChange={e => setEditing({ ...editing, footerHtml: e.target.value })} rows={6} className="font-mono text-xs" />
                <div className={styles.htmlPreview} dangerouslySetInnerHTML={{ __html: editing.footerHtml }} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{preview?.name}</DialogTitle></DialogHeader>
          {preview && (
            <div className="space-y-3">
              <div><Label className="text-xs text-muted-foreground">HEADER</Label>
                <div className={styles.htmlPreview} dangerouslySetInnerHTML={{ __html: preview.headerHtml }} /></div>
              <div><Label className="text-xs text-muted-foreground">FOOTER</Label>
                <div className={styles.htmlPreview} dangerouslySetInnerHTML={{ __html: preview.footerHtml }} /></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ==================== Hero Metadata ==================== */
function HeroTab() {
  const { toast } = useToast();
  const [value, setValue] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [valid, setValid] = useState(true);

  useEffect(() => {
    const m = getHeroMetadata();
    setValue(m.json);
    setSavedAt(m.updatedAt);
  }, []);

  useEffect(() => {
    try { JSON.parse(value); setValid(true); } catch { setValid(false); }
  }, [value]);

  const save = () => {
    if (!valid) { toast({ title: "Invalid JSON", variant: "destructive" }); return; }
    const m = saveHeroMetadata(value);
    setSavedAt(m.updatedAt);
    toast({ title: "Saved", description: "Hero metadata updated." });
  };
  const format = () => {
    try { setValue(JSON.stringify(JSON.parse(value), null, 2)); }
    catch { toast({ title: "Cannot format invalid JSON", variant: "destructive" }); }
  };

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionTitleRow}>
        <div>
          <h2>Hero Page Metadata</h2>
          <p>JSON payload consumed by the app home page to render hero content dynamically.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={format}>Format</Button>
          <Button onClick={save} disabled={!valid}>Save</Button>
        </div>
      </div>

      <Textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        className={`${styles.jsonEditor} ${!valid ? styles.jsonInvalid : ""}`}
        spellCheck={false}
      />
      <div className={styles.editorMeta}>
        <span className={valid ? "text-emerald-600" : "text-destructive"}>
          {valid ? "✓ Valid JSON" : "✕ Invalid JSON"}
        </span>
        <span>Last saved: {savedAt ? new Date(savedAt).toLocaleString() : "—"}</span>
      </div>
    </div>
  );
}

/* ==================== Operations ==================== */
function OperationsTab() {
  const { toast } = useToast();
  const [token] = useState(getBearerToken());
  const [regions, setRegions] = useState<CacheRegion[]>([]);
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const active = regions.find(r => r.name === activeRegion) ?? null;

  const load = async () => {
    setLoading(true);
    const r = await fetchCacheRegions();
    setRegions(r);
    setActiveRegion(r[0]?.name ?? null);
    setLoading(false);
    toast({ title: "Cache regions loaded", description: `${r.length} regions found.` });
  };

  const clearAll = () => {
    setRegions([]); setActiveRegion(null);
    toast({ title: "All caches cleared" });
  };
  const clearRegion = (name: string) => {
    setRegions(regions.filter(r => r.name !== name));
    if (activeRegion === name) setActiveRegion(null);
    toast({ title: `Cleared region: ${name}` });
  };
  const deleteKey = (region: string, key: string) => {
    setRegions(regions.map(r => r.name === region ? { ...r, keys: r.keys.filter(k => k.key !== key) } : r));
    toast({ title: "Key evicted", description: key });
  };
  const copyToken = async () => {
    await navigator.clipboard.writeText(token);
    toast({ title: "Token copied" });
  };

  return (
    <div className="space-y-6">
      {/* Bearer token */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionTitleRow}>
          <div>
            <h2><Shield className="h-4 w-4 inline mr-2" />Session Bearer Token</h2>
            <p>Current signed-in user token — useful for API testing.</p>
          </div>
          <Button variant="outline" onClick={copyToken}><Copy className="h-4 w-4 mr-2" />Copy</Button>
        </div>
        <div className={styles.tokenBox}>
          <KeyRound className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
          <span>{token}</span>
        </div>
      </div>

      {/* Cache management */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionTitleRow}>
          <div>
            <h2><Database className="h-4 w-4 inline mr-2" />Cache Management</h2>
            <p>Fetch cache regions, inspect keys and evict entries.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {regions.length ? "Reload" : "Fetch cache keys"}
            </Button>
            {regions.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive"><Trash className="h-4 w-4 mr-2" />Clear all</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all caches?</AlertDialogTitle>
                    <AlertDialogDescription>This will evict every key across every region.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={clearAll}>Clear all</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {regions.length === 0 ? (
          <div className={styles.emptyState}>
            {loading ? "Loading cache regions…" : 'Click "Fetch cache keys" to load cache regions.'}
          </div>
        ) : (
          <div className={styles.regionGrid}>
            <div className={styles.regionList}>
              {regions.map(r => (
                <div
                  key={r.name}
                  className={`${styles.regionItem} ${activeRegion === r.name ? styles.active : ""}`}
                  onClick={() => setActiveRegion(r.name)}
                >
                  <span>{r.name}</span>
                  <span className={styles.count}>{r.keys.length}</span>
                </div>
              ))}
            </div>

            <div>
              {active ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium">
                      Region: <span className="font-mono">{active.name}</span>
                      <Badge variant="secondary" className="ml-2">{active.keys.length} keys</Badge>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => clearRegion(active.name)}>
                      <Trash className="h-3.5 w-3.5 mr-1.5" />Clear region
                    </Button>
                  </div>
                  {active.keys.length === 0 ? (
                    <div className={styles.emptyState}>No keys in this region.</div>
                  ) : (
                    <div className={styles.keyList}>
                      {active.keys.map(k => (
                        <div key={k.key} className={styles.keyRow}>
                          <span className={styles.keyName}>{k.key}</span>
                          <span className={styles.keyMeta}>{k.size} · TTL {k.ttl}</span>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-3.5 w-3.5 mr-1.5" />View
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle className="font-mono text-sm break-all">{k.key}</DialogTitle>
                                <DialogDescription>Region: {active.name}</DialogDescription>
                              </DialogHeader>
                              <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-96">
{JSON.stringify({ key: k.key, size: k.size, ttl: k.ttl, sample: "// value payload preview" }, null, 2)}
                              </pre>
                            </DialogContent>
                          </Dialog>
                          <Button variant="ghost" size="sm" onClick={() => deleteKey(active.name, k.key)}>
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.emptyState}>Select a region to view keys.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;
