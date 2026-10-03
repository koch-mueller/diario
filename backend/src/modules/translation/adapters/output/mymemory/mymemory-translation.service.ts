import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type TranslationMode = 'deutsch' | 'marie';
export type TranslationTargetLanguage = 'DE' | 'FR' | 'ES' | 'IT' | 'JA';

type TranslationSourceLanguage = TranslationTargetLanguage | 'EN';

type TranslatableAppField =
  'title' | 'description' | 'location' | 'name' | 'quantity' | 'category';

type MyMemoryTranslateResponse = {
  responseData: {
    translatedText: string;
    match?: number | string | null;
  };
  responseDetails?: string | null;
  responseStatus?: number | string | null;
  quotaFinished?: boolean | string | null;
  matches?: unknown;
};

type TranslationSlot = {
  itemId: string;
  field: TranslatableAppField;
  text: string;
  targetLanguage: TranslationTargetLanguage;
};

type TranslatedFieldMap = Map<
  string,
  Partial<Record<TranslatableAppField, string>>
>;

export type TranslationPreviewItem = {
  id: string;
  fields: Partial<Record<TranslatableAppField, string | null | undefined>>;
};

export type TranslatedPreviewItem = {
  id: string;
  fields: Partial<Record<TranslatableAppField, string | null>>;
};

/**
 * Wird ausgelöst, wenn MyMemory nicht erreichbar ist oder eine ungültige Antwort liefert.
 */
export class TranslationProviderError extends Error {
  /**
   * Erstellt den Fehler mit einer verständlichen Beschreibung.
   */
  constructor(message: string) {
    super(message);
    this.name = 'TranslationProviderError';
  }
}

/**
 * Übersetzt Einträge der Anwendung über die MyMemory-API.
 *
 * Im Deutsch-Modus werden Texte nach Deutsch übersetzt. Im Marie-Modus wird
 * für jede Eintrags-ID dauerhaft dieselbe Zielsprache ausgewählt.
 */
@Injectable()
export class MyMemoryTranslationService {
  private readonly marieModeLanguages: TranslationTargetLanguage[] = [
    'FR',
    'ES',
    'IT',
    'JA',
  ];

  private readonly maxMyMemoryTextBytes = 450;

  /**
   * Liest API-Adresse und optionale Kontakt-E-Mail aus der Konfiguration.
   */
  constructor(private readonly configService: ConfigService) {}

  /**
   * Übersetzt eine allgemeine Liste unterstützter Textfelder.
   */
  async translateItems(
    items: TranslationPreviewItem[],
    mode: TranslationMode,
  ): Promise<TranslatedPreviewItem[]> {
    if (items.length === 0) {
      return [];
    }

    const slots = this.createTranslationSlots(items, mode);

    if (slots.length === 0) {
      return items.map((item) => ({
        id: item.id,
        fields: this.normalizeFields(item.fields),
      }));
    }

    const translatedFields = await this.translateSlots(slots, mode);

    return items.map((item) => {
      const fields = this.normalizeFields(item.fields);
      const itemTranslations = translatedFields.get(item.id) ?? {};

      for (const [field, value] of Object.entries(itemTranslations)) {
        const safeField = field as TranslatableAppField;
        fields[safeField] = value ?? fields[safeField] ?? null;
      }

      return {
        id: item.id,
        fields,
      };
    });
  }

  /**
   * Wandelt die belegten Textfelder in einzelne Übersetzungsaufträge um.
   */
  private createTranslationSlots(
    items: TranslationPreviewItem[],
    mode: TranslationMode,
  ): TranslationSlot[] {
    const slots: TranslationSlot[] = [];

    for (const item of items) {
      const targetLanguage = this.getTargetLanguageForItem(item.id, mode);

      for (const field of this.getTranslatableFields()) {
        const text = item.fields[field];

        if (typeof text !== 'string' || !text.trim()) {
          continue;
        }

        slots.push({
          itemId: item.id,
          field,
          text,
          targetLanguage,
        });
      }
    }

    return slots;
  }

  /**
   * Liefert alle Felder, die von der Übersetzungsfunktion unterstützt werden.
   */
  private getTranslatableFields(): TranslatableAppField[] {
    return ['title', 'description', 'location', 'name', 'quantity', 'category'];
  }

  /**
   * Übersetzt die vorbereiteten Felder nacheinander und ordnet sie ihren Einträgen zu.
   */
  private async translateSlots(
    slots: TranslationSlot[],
    mode: TranslationMode,
  ): Promise<TranslatedFieldMap> {
    const translatedFields: TranslatedFieldMap = new Map();

    for (const slot of slots) {
      const translatedText = await this.requestTranslation(
        slot.text,
        slot.targetLanguage,
        mode,
      );
      const currentFields = translatedFields.get(slot.itemId) ?? {};
      currentFields[slot.field] = translatedText;
      translatedFields.set(slot.itemId, currentFields);
    }

    return translatedFields;
  }

  /**
   * Erkennt die Ausgangssprache und übersetzt einen einzelnen Text.
   */
  private async requestTranslation(
    text: string,
    targetLanguage: TranslationTargetLanguage,
    mode: TranslationMode,
  ): Promise<string> {
    const trimmedText = text.trim();

    if (!trimmedText) {
      return text;
    }

    const sourceLanguage = this.detectSourceLanguage(trimmedText, mode);
    const safeTargetLanguage = this.resolveTargetLanguage(
      sourceLanguage,
      targetLanguage,
      trimmedText,
    );

    if (mode === 'deutsch' && sourceLanguage === safeTargetLanguage) {
      return text;
    }

    const translatedText = await this.requestTranslationWithSourceFallbacks(
      trimmedText,
      sourceLanguage,
      safeTargetLanguage,
      mode,
    );

    return translatedText.trim() || text;
  }

  /**
   * Probiert bei einer unveränderten Antwort weitere mögliche Ausgangssprachen.
   */
  private async requestTranslationWithSourceFallbacks(
    text: string,
    sourceLanguage: TranslationSourceLanguage,
    targetLanguage: TranslationTargetLanguage,
    mode: TranslationMode,
  ): Promise<string> {
    const sourceLanguages = this.getSourceLanguageFallbacks(
      sourceLanguage,
      targetLanguage,
      mode,
    );
    let lastTranslatedText = text;

    for (const language of sourceLanguages) {
      if (language === targetLanguage) {
        continue;
      }

      const translatedText = await this.requestTranslationInChunks(
        text,
        language,
        targetLanguage,
      );

      lastTranslatedText = translatedText;

      if (!this.isSameText(text, translatedText)) {
        return translatedText;
      }
    }

    return lastTranslatedText;
  }

  /**
   * Legt die Reihenfolge möglicher Ausgangssprachen für einen Übersetzungsversuch fest.
   */
  private getSourceLanguageFallbacks(
    sourceLanguage: TranslationSourceLanguage,
    targetLanguage: TranslationTargetLanguage,
    mode: TranslationMode,
  ): TranslationSourceLanguage[] {
    const fallbacks: TranslationSourceLanguage[] = [sourceLanguage];

    if (mode === 'marie') {
      fallbacks.push('DE', 'EN', 'FR', 'ES', 'IT');
    } else {
      fallbacks.push('EN', 'FR', 'ES', 'IT', 'JA');
    }

    return Array.from(new Set(fallbacks)).filter(
      (language) => language !== targetLanguage,
    );
  }

  /**
   * Teilt lange Texte in API-kompatible Abschnitte und setzt das Ergebnis wieder zusammen.
   */
  private async requestTranslationInChunks(
    text: string,
    sourceLanguage: TranslationSourceLanguage,
    targetLanguage: TranslationTargetLanguage,
  ): Promise<string> {
    const chunks = this.splitTextIntoMyMemoryChunks(text);
    const translatedChunks: string[] = [];

    for (const chunk of chunks) {
      translatedChunks.push(
        await this.requestTranslationChunk(
          chunk,
          sourceLanguage,
          targetLanguage,
        ),
      );
    }

    return translatedChunks.join(' ').trim();
  }

  /**
   * Prüft normalisiert, ob sich Original und Übersetzung unterscheiden.
   */
  private isSameText(originalText: string, translatedText: string): boolean {
    const normalize = (value: string) =>
      value
        .trim()
        .toLowerCase()
        .replace(/[\s.,;:!?¡¿'"“”‘’`´]+/g, '');

    return normalize(originalText) === normalize(translatedText);
  }

  /**
   * Schätzt die Sprache eines Textes anhand typischer Wörter und Zeichen.
   */
  private detectSourceLanguage(
    text: string,
    mode: TranslationMode,
  ): TranslationSourceLanguage {
    const normalizedText = text.toLowerCase();

    if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/u.test(text)) {
      return 'JA';
    }

    const languageScores: Record<TranslationSourceLanguage, number> = {
      DE: 0,
      FR: 0,
      ES: 0,
      IT: 0,
      JA: 0,
      EN: 0,
    };

    this.addScoreForMatches(languageScores, 'DE', normalizedText, [
      'ä',
      'ö',
      'ü',
      'ß',
      'der',
      'die',
      'das',
      'ein',
      'eine',
      'mit',
      'zum',
      'zur',
      'und',
      'heute',
      'morgen',
      'termin',
      'einkaufen',
      'einkauf',
      'arzt',
      'müll',
      'muell',
      'rausbringen',
      'wohnung',
      'putzen',
      'wäsche',
      'waesche',
      'küche',
      'kueche',
      'treffen',
      'geburtstag',
      'abendessen',
      'bezahlen',
      'miete',
      'strom',
      'wasser',
      'rechnung',
      'brot',
      'milch',
      'kaffee',
      'gemüse',
      'gemuese',
    ]);

    this.addScoreForMatches(languageScores, 'FR', normalizedText, [
      'à',
      'â',
      'ç',
      'é',
      'è',
      'ê',
      'ë',
      'î',
      'ï',
      'ô',
      'ù',
      'û',
      'le',
      'la',
      'les',
      'des',
      'du',
      'un',
      'une',
      'avec',
      'pour',
      'chez',
      'demain',
      'aujourd',
      'rendez-vous',
      'médecin',
      'courses',
      'réunion',
      'dîner',
      'anniversaire',
    ]);

    this.addScoreForMatches(languageScores, 'ES', normalizedText, [
      '¿',
      '¡',
      'á',
      'í',
      'ó',
      'ú',
      'ñ',
      'el',
      'los',
      'las',
      'una',
      'unos',
      'unas',
      'con',
      'para',
      'mañana',
      'hoy',
      'cita',
      'médico',
      'compra',
      'comprar',
      'cena',
      'reunión',
      'cumpleaños',
    ]);

    this.addScoreForMatches(languageScores, 'IT', normalizedText, [
      'il',
      'lo',
      'gli',
      'una',
      'uno',
      'con',
      'per',
      'domani',
      'oggi',
      'appuntamento',
      'medico',
      'spesa',
      'cena',
      'riunione',
      'compleanno',
      'cucina',
      'pulire',
    ]);

    this.addScoreForMatches(languageScores, 'EN', normalizedText, [
      'the',
      'with',
      'for',
      'today',
      'tomorrow',
      'appointment',
      'doctor',
      'shopping',
      'dinner',
      'meeting',
      'birthday',
      'clean',
      'kitchen',
    ]);

    return this.getHighestScoringLanguage(
      languageScores,
      mode === 'marie' ? 'DE' : 'EN',
    );
  }

  /**
   * Erhöht den Sprachwert, wenn typische Wörter oder Zeichen gefunden werden.
   */
  private addScoreForMatches(
    scores: Record<TranslationSourceLanguage, number>,
    language: TranslationSourceLanguage,
    text: string,
    matches: string[],
  ): void {
    const words = new Set(text.split(/[^\p{L}\p{N}]+/u).filter(Boolean));

    for (const match of matches) {
      if (match.length === 1) {
        if (text.includes(match)) {
          scores[language] += 2;
        }
        continue;
      }

      if (match.includes('-')) {
        if (text.includes(match)) {
          scores[language] += 2;
        }
        continue;
      }

      if (words.has(match)) {
        scores[language] += match.length <= 2 ? 1 : 2;
      }
    }
  }

  /**
   * Liefert die Sprache mit dem höchsten ermittelten Wert.
   */
  private getHighestScoringLanguage(
    scores: Record<TranslationSourceLanguage, number>,
    fallbackLanguage: TranslationSourceLanguage,
  ): TranslationSourceLanguage {
    const orderedLanguages: TranslationSourceLanguage[] = [
      'DE',
      'FR',
      'ES',
      'IT',
      'EN',
      'JA',
    ];
    let selectedLanguage: TranslationSourceLanguage = fallbackLanguage;
    let selectedScore = 0;

    for (const language of orderedLanguages) {
      const score = scores[language];

      if (score > selectedScore) {
        selectedLanguage = language;
        selectedScore = score;
      }
    }

    return selectedScore > 0 ? selectedLanguage : fallbackLanguage;
  }

  /**
   * Wählt eine andere Zielsprache, falls Ausgangs- und Zielsprache identisch sind.
   */
  private resolveTargetLanguage(
    sourceLanguage: TranslationSourceLanguage,
    targetLanguage: TranslationTargetLanguage,
    text: string,
  ): TranslationTargetLanguage {
    if (sourceLanguage !== targetLanguage) {
      return targetLanguage;
    }

    if (targetLanguage === 'DE') {
      return targetLanguage;
    }

    const offset = Math.max(1, text.length % this.marieModeLanguages.length);
    const currentIndex = this.marieModeLanguages.indexOf(targetLanguage);
    const nextIndex =
      currentIndex >= 0
        ? (currentIndex + offset) % this.marieModeLanguages.length
        : 0;

    return this.marieModeLanguages[nextIndex] ?? 'FR';
  }

  /**
   * Zerlegt einen Text so, dass jeder Abschnitt unter dem MyMemory-Limit bleibt.
   */
  private splitTextIntoMyMemoryChunks(text: string): string[] {
    if (Buffer.byteLength(text, 'utf8') <= this.maxMyMemoryTextBytes) {
      return [text];
    }

    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const word of words) {
      const candidate = currentChunk ? `${currentChunk} ${word}` : word;

      if (Buffer.byteLength(candidate, 'utf8') <= this.maxMyMemoryTextBytes) {
        currentChunk = candidate;
        continue;
      }

      if (currentChunk) {
        chunks.push(currentChunk);
      }

      if (Buffer.byteLength(word, 'utf8') <= this.maxMyMemoryTextBytes) {
        currentChunk = word;
      } else {
        chunks.push(...this.splitLongWord(word));
        currentChunk = '';
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * Zerlegt ein einzelnes zu langes Wort in kleinere UTF-8-sichere Teile.
   */
  private splitLongWord(word: string): string[] {
    const chunks: string[] = [];
    let currentChunk = '';

    for (const character of Array.from(word)) {
      const candidate = `${currentChunk}${character}`;

      if (Buffer.byteLength(candidate, 'utf8') <= this.maxMyMemoryTextBytes) {
        currentChunk = candidate;
        continue;
      }

      if (currentChunk) {
        chunks.push(currentChunk);
      }

      currentChunk = character;
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Sendet einen Abschnitt an MyMemory und validiert die Antwort.
   */
  private async requestTranslationChunk(
    text: string,
    sourceLanguage: TranslationSourceLanguage,
    targetLanguage: TranslationTargetLanguage,
  ): Promise<string> {
    const apiUrl = this.configService.get<string>(
      'MYMEMORY_API_URL',
      'https://api.mymemory.translated.net/get',
    );
    const contactEmail = this.configService.get<string>('MYMEMORY_EMAIL');
    const url = new URL(apiUrl);

    url.searchParams.set('q', text);
    url.searchParams.set(
      'langpair',
      `${sourceLanguage.toLowerCase()}|${targetLanguage.toLowerCase()}`,
    );
    url.searchParams.set('mt', '1');

    if (contactEmail) {
      url.searchParams.set('de', contactEmail);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new TranslationProviderError(
          `MyMemory konnte die Einträge nicht übersetzen. Status: ${response.status}. ${errorText}`,
        );
      }

      const data: unknown = await response.json();

      if (!this.isMyMemoryTranslateResponse(data)) {
        throw new TranslationProviderError(
          `MyMemory hat eine unerwartete Antwort zurückgegeben. Antwort: ${this.stringifyUnknownResponse(data)}`,
        );
      }

      this.throwIfProviderReturnedError(data);

      const translatedText = data.responseData.translatedText.trim();

      return translatedText || text;
    } catch (error) {
      if (error instanceof TranslationProviderError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new TranslationProviderError(
          'MyMemory hat zu lange nicht geantwortet. Bitte versuche es später erneut.',
        );
      }

      throw new TranslationProviderError(
        error instanceof Error
          ? error.message
          : 'MyMemory konnte die Einträge nicht übersetzen.',
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Übersetzt Fehlerangaben der API in einen verständlichen Anwendungsfehler.
   */
  private throwIfProviderReturnedError(data: MyMemoryTranslateResponse): void {
    if (data.quotaFinished === true || data.quotaFinished === 'true') {
      throw new TranslationProviderError(
        'MyMemory hat das kostenlose Übersetzungslimit erreicht. Bitte später erneut versuchen.',
      );
    }

    const responseStatus = this.parseResponseStatus(data.responseStatus);

    if (responseStatus >= 400) {
      throw new TranslationProviderError(
        `MyMemory konnte die Einträge nicht übersetzen. ${data.responseDetails ?? 'Keine weiteren Details.'}`,
      );
    }

    const translatedText = data.responseData.translatedText.toLowerCase();

    if (
      translatedText.includes('invalid source language') ||
      translatedText.includes('invalid target language') ||
      translatedText.includes('invalid language pair')
    ) {
      throw new TranslationProviderError(
        `MyMemory konnte die Sprachkombination nicht übersetzen. ${data.responseData.translatedText}`,
      );
    }
  }

  /**
   * Wandelt den Status der API unabhängig vom gelieferten Datentyp in eine Zahl um.
   */
  private parseResponseStatus(
    status: number | string | null | undefined,
  ): number {
    if (typeof status === 'number') {
      return status;
    }

    if (typeof status === 'string') {
      const parsedStatus = Number.parseInt(status, 10);

      return Number.isNaN(parsedStatus) ? 200 : parsedStatus;
    }

    return 200;
  }

  /**
   * Entfernt nicht unterstützte Feldwerte und behält Strings sowie null.
   */
  private normalizeFields(
    fields: Partial<Record<TranslatableAppField, string | null | undefined>>,
  ): Partial<Record<TranslatableAppField, string | null>> {
    const normalizedFields: Partial<
      Record<TranslatableAppField, string | null>
    > = {};

    for (const field of this.getTranslatableFields()) {
      const value = fields[field];

      if (typeof value === 'string') {
        normalizedFields[field] = value;
      } else if (value === null) {
        normalizedFields[field] = null;
      }
    }

    return normalizedFields;
  }

  /**
   * Bestimmt die Zielsprache für einen Eintrag.
   */
  private getTargetLanguageForItem(
    itemId: string,
    mode: TranslationMode,
  ): TranslationTargetLanguage {
    if (mode === 'deutsch') {
      return 'DE';
    }

    const hash = this.hashItemId(itemId);
    const languageIndex = hash % this.marieModeLanguages.length;

    return this.marieModeLanguages[languageIndex] ?? 'FR';
  }

  /**
   * Erzeugt aus einer Eintrags-ID einen stabilen positiven Zahlenwert.
   */
  private hashItemId(itemId: string): number {
    let hash = 0;

    for (const character of itemId) {
      hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
    }

    return hash;
  }

  /**
   * Prüft zur Laufzeit, ob die Antwort die erwartete MyMemory-Struktur besitzt.
   */
  private isMyMemoryTranslateResponse(
    value: unknown,
  ): value is MyMemoryTranslateResponse {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const maybeResponse = value as {
      responseData?: unknown;
      responseDetails?: unknown;
      responseStatus?: unknown;
      quotaFinished?: unknown;
      matches?: unknown;
    };

    if (
      typeof maybeResponse.responseData !== 'object' ||
      maybeResponse.responseData === null
    ) {
      return false;
    }

    const maybeResponseData = maybeResponse.responseData as {
      translatedText?: unknown;
      match?: unknown;
    };

    const responseStatusIsValid =
      maybeResponse.responseStatus === undefined ||
      maybeResponse.responseStatus === null ||
      typeof maybeResponse.responseStatus === 'number' ||
      typeof maybeResponse.responseStatus === 'string';
    const responseDetailsIsValid =
      maybeResponse.responseDetails === undefined ||
      maybeResponse.responseDetails === null ||
      typeof maybeResponse.responseDetails === 'string';
    const quotaFinishedIsValid =
      maybeResponse.quotaFinished === undefined ||
      maybeResponse.quotaFinished === null ||
      typeof maybeResponse.quotaFinished === 'boolean' ||
      typeof maybeResponse.quotaFinished === 'string';
    const matchIsValid =
      maybeResponseData.match === undefined ||
      maybeResponseData.match === null ||
      typeof maybeResponseData.match === 'number' ||
      typeof maybeResponseData.match === 'string';

    return (
      typeof maybeResponseData.translatedText === 'string' &&
      responseStatusIsValid &&
      responseDetailsIsValid &&
      quotaFinishedIsValid &&
      matchIsValid
    );
  }

  /**
   * Wandelt eine unbekannte API-Antwort gekürzt in Text um.
   */
  private stringifyUnknownResponse(value: unknown): string {
    try {
      return JSON.stringify(value).slice(0, 500);
    } catch {
      return 'Antwort konnte nicht gelesen werden.';
    }
  }
}
