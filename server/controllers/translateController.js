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
  const translated = await svc.translate({ text, targetLang, sourceLang });
  res.json({ success:true, translated, sourceLang, targetLang, provider: 'local' });
}

export async function languages(req,res){
  const { supportedLanguages } = await import('../services/translationService.js');
  res.json({ success:true, languages: supportedLanguages });
}
