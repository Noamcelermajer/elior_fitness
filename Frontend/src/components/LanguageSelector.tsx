import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'he', name: 'עברית', flag: '🇮🇱' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
];

const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation();

  const changeLanguage = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    // Update HTML dir attribute for RTL support
    document.documentElement.dir = languageCode === 'he' ? 'rtl' : 'ltr';
    // Update HTML lang attribute
    document.documentElement.lang = languageCode;
    // Store preference
    localStorage.setItem('i18nextLng', languageCode);
  };

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Globe className="h-5 w-5" />
          <span className="sr-only">{t('common.selectLanguage')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px]">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => changeLanguage(language.code)}
            className={`cursor-pointer transition-colors ${
              currentLanguage.code === language.code 
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground' 
                : 'hover:bg-accent/50'
            }`}
          >
            <span className="mr-2">{language.flag}</span>
            <span>{language.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;

