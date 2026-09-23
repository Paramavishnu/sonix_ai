// Provider-based translation: Local free dictionary fallback + optional external
const dict = {
  // tiny demo dictionaries
  es: { 'hello':'hola', 'world':'mundo', 'welcome':'bienvenido', 'create':'crear', 'video':'video', 'audio':'audio', 'transform':'transformar', 'one':'uno', 'script':'guión' },
  fr: { 'hello':'bonjour', 'world':'monde', 'welcome':'bienvenue', 'create':'créer', 'video':'vidéo', 'audio':'audio' },
  de: { 'hello':'hallo', 'world':'welt', 'welcome':'willkommen', 'create':'erstellen', 'video':'video' },
  hi: { 'hello':'नमस्ते', 'world':'दुनिया', 'welcome':'स्वागत है' },
  ta: { 'hello':'வணக்கம்', 'world':'உலகம்', 'welcome':'வரவேற்கிறோம்' },
  te: { 'hello':'హలో', 'world':'ప్రపంచం', 'welcome':'స్వాగతం' },
  ml: { 'hello':'ഹലോ', 'world':'ലോകം', 'welcome':'സ്വാഗതം' }
};

export class LocalTranslationProvider {
  async translate({ text, targetLang }) {
    if (!dict[targetLang]) {
      // deterministic mock: prefix with lang code
      return `[${targetLang}] ${text}`;
    }
    // Simple word replacement + prefix
    let out = text;
    const map = dict[targetLang];
    for (const [en, tr] of Object.entries(map)) {
      const re = new RegExp(`\\b${en}\\b`, 'gi');
      out = out.replace(re, tr);
    }
    // If no word matched, still indicate mock translation
    if (out === text) out = `[${targetLang}] ${text}`;
    return out;
  }
  isAvailable(){ return true; }
}

export class ExternalTranslationProvider {
  constructor(apiKey){ this.apiKey = apiKey; }
  isAvailable(){ return !!this.apiKey; }
  async translate({ text, targetLang, sourceLang }) {
    if (!this.isAvailable()) throw new Error('Translation model is not configured.');
    // Would call external API here; fallback to local
    return new LocalTranslationProvider().translate({ text, targetLang });
  }
}

export class TranslationService {
  constructor(provider){
    this.provider = provider || new LocalTranslationProvider();
    this.fallback = new LocalTranslationProvider();
  }
  async translate(opts){
    try {
      if (this.provider && this.provider.isAvailable && this.provider.isAvailable()) {
        return await this.provider.translate(opts);
      }
      throw new Error('Translation model is not configured.');
    } catch(e) {
      if (e.message.includes('not configured')) throw e;
      return this.fallback.translate(opts);
    }
  }
}

export const supportedLanguages = [
  { code:'en', name:'English' },
  { code:'ta', name:'Tamil' },
  { code:'hi', name:'Hindi' },
  { code:'te', name:'Telugu' },
  { code:'ml', name:'Malayalam' },
  { code:'es', name:'Spanish' },
  { code:'fr', name:'French' },
  { code:'de', name:'German' },
];
