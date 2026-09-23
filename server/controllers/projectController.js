import { FirebaseService } from '../services/firebaseService.js';

export async function list(req,res){
  const { type, language, platform, search, sort='updated' } = req.query;
  const projects = await FirebaseService.listProjects(req.user.uid, { type, language, platform, search });
  res.json({ success:true, projects });
}
export async function get(req,res){
  const p = await FirebaseService.getProject(req.user.uid, req.params.id);
  if(!p) return res.status(404).json({success:false, error:'Project not found'});
  res.json({ success:true, project:p });
}
export async function create(req,res){
  const p = await FirebaseService.createProject(req.user.uid, req.body);
  res.status(201).json({ success:true, project:p });
}
export async function update(req,res){
  const p = await FirebaseService.updateProject(req.user.uid, req.params.id, req.body);
  res.json({ success:true, project:p });
}
export async function remove(req,res){
  await FirebaseService.deleteProject(req.user.uid, req.params.id);
  res.json({ success:true });
}
export async function duplicate(req,res){
  const p = await FirebaseService.duplicateProject(req.user.uid, req.params.id);
  res.json({ success:true, project:p });
}
export async function version(req,res){
  const v = await FirebaseService.createVersion(req.user.uid, req.params.id);
  res.json({ success:true, version:v });
}
export async function listVersions(req,res){
  const vs = await FirebaseService.listVersions(req.user.uid, req.params.id);
  res.json({ success:true, versions:vs });
}
