'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {apiRequest} from '@/services/auth';

type Project={id:string;name:string;description:string;status:string;updatedAt:string};
type ProjectFile={id:string;path:string;content?:string;language:string;mimeType:string};
type ProjectList={projects:Project[]};
type FileList={files:ProjectFile[]};
type GenerationJob={id:string;status:'queued'|'processing'|'completed'|'failed';files?:Array<{path:string}>;errorMessage?:string|null};

export default function ProjectWorkspace(){
  const [projects,setProjects]=useState<Project[]>([]);
  const [active,setActive]=useState<Project|null>(null);
  const [files,setFiles]=useState<ProjectFile[]>([]);
  const [selected,setSelected]=useState<ProjectFile|null>(null);
  const [name,setName]=useState('');
  const [description,setDescription]=useState('');
  const [buildPrompt,setBuildPrompt]=useState('');
  const [newPath,setNewPath]=useState('index.html');
  const [content,setContent]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [preview,setPreview]=useState(false);
  const [generationId,setGenerationId]=useState<string|null>(null);

  const loadProjects=useCallback(async()=>{
    const result=await apiRequest<ProjectList>('/projects');
    setProjects(result.projects||[]);
  },[]);
  useEffect(()=>{void loadProjects().catch(e=>setError(e instanceof Error?e.message:'Projects could not be loaded.'));},[loadProjects]);

  async function openProject(project:Project){
    setBusy(true);setError('');setNotice('');setPreview(false);
    try{
      // Read the generation state before listing files. A build can finish between
      // the first file-list request and this status request; in that race the
      // earlier list is stale and the preview incorrectly reports no index.html.
      const generation=await apiRequest<{job:GenerationJob|null}>('/projects/'+encodeURIComponent(project.id)+'/generation');
      const result=await apiRequest<FileList>('/projects/'+encodeURIComponent(project.id)+'/files');
      const savedFiles=result.files||[];
      setActive(project);setFiles(savedFiles);setSelected(null);setContent('');
      if(generation.job&&['queued','processing'].includes(generation.job.status)){
        setGenerationId(generation.job.id);setNotice('A project build is still running. Use Refresh to check its progress.');
      }else{
        setGenerationId(null);
        if(generation.job?.status==='completed'){
          const hasIndex=savedFiles.some(file=>file.path==='index.html'&&Boolean(file.content));
          setNotice(hasIndex?'The latest project build completed. Saved index.html is loaded and ready to preview.':'The latest build completed, but index.html was not returned in the saved-file list. Refresh to retry the file read.');
        }else if(generation.job?.status==='failed')setNotice(generation.job.errorMessage||'The latest project build failed. Your existing saved files are still available.');
      }
    }catch(e){setError(e instanceof Error?e.message:'Project could not be opened.');}
    finally{setBusy(false);}
  }
  async function createProject(event:React.FormEvent){
    event.preventDefault();if(!name.trim()||busy)return;
    setBusy(true);setError('');setNotice('');
    try{
      const result=await apiRequest<{project:Project}>('/projects',{method:'POST',body:JSON.stringify({name:name.trim(),description:description.trim()})});
      setProjects(old=>[result.project,...old]);setName('');setDescription('');setBuildPrompt(description.trim()||'Create a polished, responsive website for '+name.trim()+'. Include a homepage, clear navigation, relevant sections, and a contact section.');await openProject(result.project);setNotice('Project created and saved to your MADSI Workspace.');
    }catch(e){setError(e instanceof Error?e.message:'Project could not be created.');}
    finally{setBusy(false);}
  }
  function chooseFile(file:ProjectFile){setSelected(file);setNewPath(file.path);setContent(file.content||'');setPreview(false);setError('');}
  async function loadFile(file:ProjectFile){
    if(!active)return;
    try{
      const result=await apiRequest<FileList>('/projects/'+encodeURIComponent(active.id)+'/files');
      const found=(result.files||[]).find(item=>item.id===file.id||item.path===file.path);
      if(found){setFiles(result.files);setSelected(found);setNewPath(found.path);setContent(found.content||'');setPreview(false);}
    }catch(e){setError(e instanceof Error?e.message:'File could not be opened.');}
  }
  async function generateProject(){
    if(!active||!buildPrompt.trim()||busy)return;
    const project=active;setBusy(true);setError('');setNotice('MADSI is starting your background generation…');setPreview(false);
    try{
      const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
      const started=await apiRequest<{success:boolean;job:GenerationJob;message:string}>('/projects/'+encodeURIComponent(project.id)+'/generate',{method:'POST',body:JSON.stringify({prompt:buildPrompt.trim(),timezone,requestId:crypto.randomUUID()})});
      setGenerationId(started.job.id);
      const deadline=Date.now()+180000;
      setNotice('MADSI is building in the background. You can keep this screen open; progress will update here.');
      while(Date.now()<deadline){
        await new Promise(resolve=>setTimeout(resolve,2500));
        const state=await apiRequest<{job:GenerationJob|null}>('/projects/'+encodeURIComponent(project.id)+'/generation/'+encodeURIComponent(started.job.id));
        if(!state.job)throw new Error('Generation status could not be found. Refresh the project to check its saved files.');
        if(state.job.status==='failed'){setGenerationId(null);throw new Error(state.job.errorMessage||'MADSI could not complete this generation. Your existing saved files were preserved.');}
        if(state.job.status==='completed'){
          setGenerationId(null);
          const saved=await apiRequest<FileList>('/projects/'+encodeURIComponent(project.id)+'/files');
          setActive(current=>current?.id===project.id?{...current,status:'ready'}:current);
          setProjects(current=>current.map(item=>item.id===project.id?{...item,status:'ready'}:item));
          setFiles(saved.files||[]);setSelected(null);setContent('');
          setNotice('Generation completed. '+(state.job.files?.length||saved.files?.length||0)+' files were saved to this project.');
          return;
        }
        setNotice(state.job.status==='queued'?'MADSI has queued your build…':'MADSI is still generating. Your project files are being saved when the build finishes…');
      }
      setNotice('MADSI is still processing in the background. Your project is safe; tap Refresh after a moment to check for saved files.');
    }catch(e){setError(e instanceof Error?e.message:'MADSI could not generate this project.');setNotice('');}
    finally{setBusy(false);}
  }
  async function saveFile(){
    if(!active||!newPath.trim()||busy)return;
    if(!content.trim()){setError('Add file contents before saving. Empty files cannot be saved.');setNotice('');return;}
    setBusy(true);setError('');setNotice('');setPreview(false);
    try{
      await apiRequest('/projects/'+encodeURIComponent(active.id)+'/files',{method:'POST',body:JSON.stringify({path:newPath.trim(),content,language:newPath.endsWith('.html')?'html':newPath.endsWith('.css')?'css':newPath.endsWith('.js')?'javascript':'text',mimeType:newPath.endsWith('.html')?'text/html':newPath.endsWith('.css')?'text/css':newPath.endsWith('.js')?'text/javascript':'text/plain'})});
      const result=await apiRequest<FileList>('/projects/'+encodeURIComponent(active.id)+'/files');
      const found=(result.files||[]).find(file=>file.path===newPath.trim());
      setFiles(result.files||[]);setSelected(found||null);setNotice('File saved securely to this project.');
    }catch(e){setError(e instanceof Error?e.message:'File could not be saved.');}
    finally{setBusy(false);}
  }
  async function saveAndPreview(){
    if(!active||!newPath.trim()||busy)return;
    if(!content.trim()){setError('Add file contents before saving and previewing. Empty files cannot be saved.');setNotice('');return;}
    setBusy(true);setError('');setNotice('Saving file and loading the saved index.html…');setPreview(false);
    try{
      await apiRequest('/projects/'+encodeURIComponent(active.id)+'/files',{method:'POST',body:JSON.stringify({path:newPath.trim(),content,language:newPath.endsWith('.html')?'html':newPath.endsWith('.css')?'css':newPath.endsWith('.js')?'javascript':'text',mimeType:newPath.endsWith('.html')?'text/html':newPath.endsWith('.css')?'text/css':newPath.endsWith('.js')?'text/javascript':'text/plain'})});
      const result=await apiRequest<FileList>('/projects/'+encodeURIComponent(active.id)+'/files');
      const savedFiles=result.files||[];
      const index=savedFiles.find(file=>file.path==='index.html');
      setFiles(savedFiles);
      if(!index?.content){setError('Your changes were saved, but this project does not have a saved index.html to preview yet.');setNotice('');return;}
      setSelected(index);setNewPath(index.path);setContent(index.content);setPreview(true);setNotice('Saved to Supabase. Preview is displaying the saved index.html.');
    }catch(e){setError(e instanceof Error?e.message:'Save & Preview failed.');setNotice('');}
    finally{setBusy(false);}
  }
  const previewHtml=useMemo(()=>{
    const html=files.find(file=>file.path==='index.html')?.content||'';
    if(!html)return '<main style="font-family:system-ui;padding:2rem;color:#d8f7f2;background:#07131b"><h2>No index.html yet</h2><p>Create and save an index.html file to preview your website.</p></main>';
    const css=files.find(file=>file.path==='styles.css')?.content||'';
    const js=files.find(file=>file.path==='script.js')?.content||'';
    let document=html;
    if(css){
      const styleTag='<style data-madsi-preview>'+css.replace(/<\/style/gi,'<\\/style')+'</style>';
      const styleLink=/<link\b(?=[^>]*\brel\s*=\s*["']?stylesheet["']?)(?=[^>]*\bhref\s*=\s*["'](?:\.\/)?styles\.css["'])[^>]*>/i;
      if(styleLink.test(document))document=document.replace(styleLink,styleTag);
      else if(/<\/head>/i.test(document))document=document.replace(/<\/head>/i,styleTag+'</head>');
      else document=styleTag+document;
    }
    if(js){
      const safeScript=js.replace(/<\/script/gi,'<\\/script');
      const scriptLink=/<script\b([^>]*\bsrc\s*=\s*["'](?:\.\/)?script\.js["'][^>]*)>\s*<\/script>/i;
      const scriptMatch=document.match(scriptLink);
      if(scriptMatch){
        const attributes=(/\bdefer\b/i.test(scriptMatch[1])?' defer':'')+(/\basync\b/i.test(scriptMatch[1])?' async':'');
        document=document.replace(scriptLink,'<script'+attributes+' data-madsi-preview>'+safeScript+'</script>');
      }else{
        const scriptTag='<script data-madsi-preview>'+safeScript+'</script>';
        if(/<\/body>/i.test(document))document=document.replace(/<\/body>/i,scriptTag+'</body>');
        else document+=scriptTag;
      }
    }
    return document;
  },[files]);
  async function refreshFile(){
    if(!active)return;
    try{
      const projectId=active.id;
      const generation=generationId
        ? await apiRequest<{job:GenerationJob|null}>('/projects/'+encodeURIComponent(projectId)+'/generation/'+encodeURIComponent(generationId))
        : await apiRequest<{job:GenerationJob|null}>('/projects/'+encodeURIComponent(projectId)+'/generation');
      const job=generation.job;
      if(job?.status==='failed'){
        setGenerationId(null);
        setError(job.errorMessage||'The latest project build failed. Your existing saved files are still available.');
      }else if(job?.status==='completed'){
        setGenerationId(null);
        const result=await apiRequest<FileList>('/projects/'+encodeURIComponent(projectId)+'/files');
        setFiles(result.files||[]);
        setActive(current=>current?.id===projectId?{...current,status:'ready'}:current);
        setProjects(current=>current.map(item=>item.id===projectId?{...item,status:'ready'}:item));
        setSelected(null);setContent('');
        setNotice('Build completed. '+(job.files?.length||result.files?.length||0)+' saved files reloaded from Supabase.');
        setError('');
      }else if(job&&['queued','processing'].includes(job.status)){
        setGenerationId(job.id);
        const result=await apiRequest<FileList>('/projects/'+encodeURIComponent(projectId)+'/files');
        setFiles(result.files||[]);
        setNotice(job.status==='queued'?'Build is queued. Check again shortly.':'Build is still running. Your existing saved files are safe.');
        setError('');
      }else{
        const result=await apiRequest<FileList>('/projects/'+encodeURIComponent(projectId)+'/files');
        setFiles(result.files||[]);
        setNotice('Project files refreshed from Supabase.');
        setError('');
      }
    }catch(e){setError(e instanceof Error?e.message:'Project status and files could not be refreshed.');}
  }
  return <section className="project-workspace">
    <header className="project-workspace-heading"><div><p className="eyebrow">MADSI / PERSISTENT WORKSPACE</p><h1>Your projects, in one place.</h1><p>Create projects, save source files and reopen your work whenever you return.</p></div><span>PRIVATE TO YOUR ACCOUNT</span></header>
    {error&&<p className="project-alert" role="alert">{error}</p>}{notice&&<p className="project-notice" role="status">{notice}</p>}
    <div className="project-workspace-grid">
      <aside className="project-panel">
        <h2>Projects <small>{projects.length}</small></h2>
        <form onSubmit={createProject} className="project-create-form">
          <label>Project name<input value={name} onChange={e=>setName(e.target.value)} maxLength={120} placeholder="e.g. Client portal" required/></label>
          <label>Description <textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={2000} rows={3} placeholder="What are you building?"/></label>
          <button type="submit" disabled={busy||!name.trim()}>{busy?'Working…':'＋ New project'}</button>
        </form>
        <div className="project-list">{projects.map(project=><button type="button" key={project.id} className={active?.id===project.id?'project-list-item selected':'project-list-item'} onClick={()=>void openProject(project)} disabled={busy}><strong>{project.name}</strong><small>{project.status} · {new Date(project.updatedAt).toLocaleDateString()}</small></button>)}{projects.length===0&&<p className="project-empty">Your saved projects will appear here.</p>}</div>
      </aside>
      <section className="project-editor-panel">
        {!active?<div className="project-empty-state"><span>◇</span><h2>Start with a project</h2><p>Create a project to keep its files together. Your work is saved to your signed-in MADSI account.</p></div>:<>
          <div className="project-editor-heading"><div><small>OPEN PROJECT</small><h2>{active.name}</h2><p>{active.description||'No description added.'}</p></div><div className="project-actions"><button type="button" className="project-secondary" onClick={()=>void refreshFile()} disabled={busy}>Refresh</button><button type="button" className="project-secondary" onClick={()=>setPreview(v=>!v)}>{preview?'Show editor':'Preview site'}</button></div></div>
          <div className="project-generate-form"><label>Tell MADSI what to build<textarea value={buildPrompt} onChange={e=>setBuildPrompt(e.target.value)} rows={3} maxLength={8000} placeholder="Describe the website, app, or tool you want MADSI to create…"/></label><button type="button" onClick={()=>void generateProject()} disabled={busy||!buildPrompt.trim()}>{busy?'Working…':'✳ Generate project & save files'}</button><small>MADSI will create source files and save them to this project. Preview is not the same as publishing.</small></div>
          {preview?<div className="project-preview"><div className="project-preview-bar">LOCAL PROJECT PREVIEW · index.html</div><iframe title={active.name+' website preview'} sandbox="allow-scripts" srcDoc={previewHtml}/></div>:<>
            <div className="project-file-layout"><aside className="project-file-list"><div><strong>FILES</strong><button type="button" onClick={()=>{setSelected(null);setNewPath('');setContent('');}}>＋</button></div>{files.map(file=><button type="button" key={file.id} className={selected?.id===file.id?'active':''} onClick={()=>void loadFile(file)}>{file.path}</button>)}{files.length===0&&<p>No files saved yet.</p>}</aside>
              <div className="project-code-editor"><label>File path<input value={newPath} onChange={e=>setNewPath(e.target.value)} placeholder="index.html"/></label><label>File contents<textarea value={content} onChange={e=>setContent(e.target.value)} spellCheck={false} rows={18} placeholder="Add your HTML, CSS, JavaScript or other project source here…"/></label><div className="project-save-row"><span>{content.length.toLocaleString()} characters</span><div className="project-save-actions"><button type="button" onClick={()=>void saveFile()} disabled={busy||!newPath.trim()||!content.trim()}>{busy?'Saving…':'Save file'}</button><button type="button" onClick={()=>void saveAndPreview()} disabled={busy||!newPath.trim()||!content.trim()||!active}>{busy?'Saving…':'Save & Preview'}</button></div></div></div>
            </div>
          </>}
        </>}
      </section>
    </div>
    <p className="project-workspace-footnote">Workspace storage is connected. Project generation runs in the background and saves files before reporting completion. Preview reads saved index.html and inlines saved styles.css and script.js when present; it does not publish or deploy the project.</p>
  </section>;
}
