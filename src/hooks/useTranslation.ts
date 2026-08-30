import { useSettingsStore } from '../store';
import { translations } from '../locales';

export function useTranslation() {
  const { language } = useSettingsStore();
  const t = (key: string, params?: Record<string, any>) => {
    let str = (translations as any)[language]?.[key] || key;
    if (params && typeof str === 'string') {
      Object.keys(params).forEach(p => {
        str = str.replace(new RegExp('{{' + p + '}}', 'g'), String(params[p]))
                 .replace(new RegExp('{' + p + '}', 'g'), String(params[p]));
      });
    }
    return str;
  };
  return { t, language };
}
