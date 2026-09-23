import { ThumbnailService, TemplateThumbnailProvider, AIThumbnailProvider } from '../services/thumbnailService.js';
import { uploadFile } from '../services/storageService.js';
import { v4 as uuidv4 } from 'uuid';

function getProvider(){
  if(process.env.OPTIONAL_AI_IMAGE_API_KEY){
    return new AIThumbnailProvider(new TemplateThumbnailProvider());
  }
  return new TemplateThumbnailProvider();
}

export async function generate(req,res){
  const { title, subtitle, template='youtube', background, textColor, format='png' } = req.body;
  if(!title) return res.status(400).json({success:false, error:'Title required'});
  const service = new ThumbnailService(getProvider());
  const result = await service.generate({ title, subtitle, template, background, textColor, format });
  const dest = `thumb-${uuidv4()}.${format==='jpg'?'jpg':'png'}`;
  const url = await uploadFile(result.file, dest);
  res.json({ success:true, url, width: result.width, height: result.height });
}
