import { db, firebaseEnabled } from '../config/firebase.js';
import { v4 as uuidv4 } from 'uuid';

// In-memory fallback when Firebase not configured (free-quota friendly, demo works)
const mem = {
  projects: new Map(),
  prompts: new Map(),
  versions: new Map()
};

function now(){ return new Date().toISOString(); }

export const FirebaseService = {
  async createProject(userId, data){
    const id = uuidv4();
    const doc = { id, userId, createdAt: now(), updatedAt: now(), status:'draft', ...data };
    if (firebaseEnabled) {
      await db.collection('projects').doc(id).set(doc);
      await db.collection('prompts').add({ id:uuidv4(), userId, projectId:id, content:data.script||'', type:'script', createdAt: now() });
    } else {
      mem.projects.set(id, doc);
      const pid = uuidv4();
      mem.prompts.set(pid, { id:pid, userId, projectId:id, content:data.script||'', type:'script', createdAt: now() });
    }
    return doc;
  },
  async listProjects(userId, filters={}){
    let list=[];
    if (firebaseEnabled) {
      const snap = await db.collection('projects').where('userId','==',userId).get();
      list = snap.docs.map(d=>d.data());
    } else {
      list = [...mem.projects.values()].filter(p=>p.userId===userId);
    }
    // filters
    if (filters.type) list = list.filter(p=> (p.type||'video')===filters.type);
    if (filters.language) list = list.filter(p=>p.language===filters.language);
    if (filters.platform) list = list.filter(p=>p.platform===filters.platform);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(p=> (p.title||'').toLowerCase().includes(q) || (p.script||'').toLowerCase().includes(q));
    }
    list.sort((a,b)=> new Date(b.updatedAt)-new Date(a.updatedAt));
    return list;
  },
  async getProject(userId, id){
    let doc=null;
    if (firebaseEnabled) {
      const d= await db.collection('projects').doc(id).get();
      if(!d.exists) return null;
      doc=d.data();
    } else {
      doc=mem.projects.get(id)||null;
    }
    if(doc && doc.userId!==userId) return null;
    return doc;
  },
  async updateProject(userId, id, data){
    const existing = await this.getProject(userId,id);
    if(!existing) throw Object.assign(new Error('Project not found'),{status:404});
    const updated = { ...existing, ...data, updatedAt: now() };
    if (firebaseEnabled) await db.collection('projects').doc(id).set(updated,{merge:true});
    else mem.projects.set(id, updated);
    return updated;
  },
  async deleteProject(userId, id){
    const existing = await this.getProject(userId,id);
    if(!existing) throw Object.assign(new Error('Project not found'),{status:404});
    if (firebaseEnabled) await db.collection('projects').doc(id).delete();
    else mem.projects.delete(id);
  },
  async duplicateProject(userId, id){
    const p=await this.getProject(userId,id);
    if(!p) throw Object.assign(new Error('Project not found'),{status:404});
    const { id: _ignore, createdAt:_c, updatedAt:_u, ...rest } = p;
    const copy={ ...rest, title: (p.title||'Untitled')+' (Copy)' };
    return this.createProject(userId, copy);
  },
  async createVersion(userId, id){
    const p=await this.getProject(userId,id);
    if(!p) throw Object.assign(new Error('Project not found'),{status:404});
    const vid=uuidv4();
    const ver={ id:vid, projectId:id, userId, data:p, createdAt:now(), version: `v${(mem.versions.get(id)?.length||0)+1}` };
    if(firebaseEnabled){
      await db.collection('projectVersions').doc(vid).set(ver);
    } else {
      const arr=mem.versions.get(id)||[];
      arr.push(ver); mem.versions.set(id,arr);
    }
    return ver;
  },
  async listVersions(userId, projectId){
    if(firebaseEnabled){
      const snap=await db.collection('projectVersions').where('projectId','==',projectId).where('userId','==',userId).get();
      return snap.docs.map(d=>d.data()).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    } else {
      return (mem.versions.get(projectId)||[]).slice().reverse();
    }
  },
  // prompts
  async listPrompts(userId){
    if(firebaseEnabled){
      const snap=await db.collection('prompts').where('userId','==',userId).get();
      return snap.docs.map(d=>d.data()).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    } else {
      return [...mem.prompts.values()].filter(p=>p.userId===userId).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    }
  },
  async createPrompt(userId, { projectId, content, type }){
    const id=uuidv4();
    const doc={ id, userId, projectId: projectId||null, content, type: type||'script', createdAt:now() };
    if(firebaseEnabled) await db.collection('prompts').doc(id).set(doc);
    else mem.prompts.set(id, doc);
    return doc;
  },
  async deletePrompt(userId, id){
    let doc=null;
    if(firebaseEnabled){ const d=await db.collection('prompts').doc(id).get(); doc=d.exists?d.data():null; }
    else doc=mem.prompts.get(id);
    if(!doc || doc.userId!==userId) throw Object.assign(new Error('Prompt not found'),{status:404});
    if(firebaseEnabled) await db.collection('prompts').doc(id).delete();
    else mem.prompts.delete(id);
  }
};
