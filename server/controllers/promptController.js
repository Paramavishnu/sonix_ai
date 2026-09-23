import { FirebaseService } from '../services/firebaseService.js';
export async function list(req,res){
  const prompts = await FirebaseService.listPrompts(req.user.uid);
  res.json({ success:true, prompts });
}
export async function create(req,res){
  const { projectId, content, type } = req.body;
  if(!content) return res.status(400).json({success:false, error:'Content required'});
  const p = await FirebaseService.createPrompt(req.user.uid, { projectId, content, type });
  res.status(201).json({ success:true, prompt:p });
}
export async function remove(req,res){
  await FirebaseService.deletePrompt(req.user.uid, req.params.id);
  res.json({ success:true });
}
