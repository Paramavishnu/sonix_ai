import { TranslationService, LocalTranslationProvider, ExternalTranslationProvider } from '../services/translationService.js';

function getService(){
  if(process.env.OPTIONAL_TRANSLATION_API_KEY){
    return new TranslationService(new ExternalTranslationProvider(process.env.OPTIONAL_TRANSLATION_API_KEY));
  }
  return new TranslationService(new LocalTranslationProvider());
}

export async function translate(req,res){
  const { text, targetLang, sourceLang='en' } = req.body;
  if(!text || !targetLang) return res.status(400).json({success:false, error:'text and targetLang required'});
  const svc = getService();
  try{
    const translated = await svc.translate({ text, targetLang, sourceLang });
    res.json({ success:true, translated, sourceLang, targetLang });
  } catch(e){
    if(e.message.includes('not configured')){
      return res.status(503).json({ success:false, error:'Translation model is not configured.' });
    }
    throw e;
  }
}

export async function languages(req,res){
  const { supportedLanguages } = await import('../services/translationService.js');
  res.json({ success:true, languages: supportedLanguages });
}
