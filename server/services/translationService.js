// Provider-based translation: Local free dictionary + deterministic mock, zero paid dependency
const dict = {
  es: { 'hello':'hola', 'world':'mundo', 'welcome':'bienvenido', 'create':'crear', 'video':'video', 'audio':'audio', 'transform':'transformar', 'one':'uno', 'script':'guión', 'write':'escribir', 'once':'una vez', 'everywhere':'en todas partes', 'future':'futuro', 'belongs':'pertenece', 'those':'aquellos', 'who':'que' },
  fr: { 'hello':'bonjour', 'world':'monde', 'welcome':'bienvenue', 'create':'créer', 'video':'vidéo', 'audio':'audio', 'write':'écrire', 'once':'une fois', 'transform':'transformer', 'script':'scénario' },
  de: { 'hello':'hallo', 'world':'welt', 'welcome':'willkommen', 'create':'erstellen', 'video':'video', 'write':'schreiben', 'once':'einmal' },
  hi: { 'hello':'नमस्ते', 'world':'दुनिया', 'welcome':'स्वागत है', 'create':'बनाएं', 'video':'वीडियो', 'audio':'ऑडियो', 'write':'लिखें', 'once':'एक बार', 'script':'स्क्रिप्ट', 'transform':'बदलें' },
  ta: { 'hello':'வணக்கம்', 'world':'உலகம்', 'welcome':'வரவேற்கிறோம்', 'create':'உருவாக்க', 'video':'வீடியோ', 'audio':'ஆடியோ', 'write':'எழுது', 'once':'ஒரு முறை', 'script':'ஸ்கிரிப்ட்' },
  te: { 'hello':'హలో', 'world':'ప్రపంచం', 'welcome':'స్వాగతం', 'create':'సృష్టించు', 'video':'వీడియో', 'audio':'ఆడియో' },
  ml: { 'hello':'ഹലോ', 'world':'ലോകം', 'welcome':'സ്വാഗതം', 'create':'സൃഷ്ടിക്കുക', 'video':'വീഡിയോ' }
};

export class LocalTranslationProvider {
  async translate({ text, targetLang }) {
    if (!text) return text;
    if (!dict[targetLang]) {
      return `[${targetLang}] ${text}`;
    }
    let out = text;
    const map = dict[targetLang];
    let replaced = 0;
    for (const [en, tr] of Object.entries(map)) {
      const re = new RegExp(`\\b${en}\\b`, 'gi');
      const before = out;
      out = out.replace(re, tr);
      if(out !== before) replaced++;
    }
    if (replaced===0) out = `[${targetLang}] ${text}`;
    return out;
  }
  isAvailable(){ return true; }
}

export class ExternalTranslationProvider {
  constructor(apiKey){ this.apiKey = apiKey; }
  isAvailable(){ return !!this.apiKey; }
  async translate({ text, targetLang }) {
    // If AI key present we could call external, but for free-first we just delegate to local
    // Never throw "not configured" here - always fallback
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
        const r = await this.provider.translate(opts);
        if(r) return r;
      }
    } catch(e) {
      // swallow and fallback
    }
    return this.fallback.translate(opts);
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
