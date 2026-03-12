import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Sparkles, 
  Download, 
  RefreshCw, 
  Check, 
  AlertCircle,
  Shirt,
  User,
  Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { processImage } from './services/gemini';
import { addWatermark } from './utils/imageUtils';

interface ImageState {
  file: File | null;
  preview: string | null;
}

export default function App() {
  const [targetPerson, setTargetPerson] = useState<ImageState>({ file: null, preview: null });
  const [clothingSource, setClothingSource] = useState<ImageState>({ file: null, preview: null });
  const [options, setOptions] = useState({
    changeClothes: true,
    changeBackground: false,
    customScenario: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFocused, setLastFocused] = useState<'target' | 'clothing' | null>(null);

  // Handle global paste
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // If an input or textarea is focused, don't intercept
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      let file: File | null = null;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          file = items[i].getAsFile();
          break;
        }
      }

      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const preview = reader.result as string;
          // Decide where to put it
          if (lastFocused === 'target') {
            setTargetPerson({ file, preview });
          } else if (lastFocused === 'clothing') {
            setClothingSource({ file, preview });
          } else {
            // Fallback: if target is empty, put it there, else clothing
            if (!targetPerson.preview) {
              setTargetPerson({ file, preview });
            } else {
              setClothingSource({ file, preview });
            }
          }
        };
        reader.readAsDataURL(file);
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [lastFocused, targetPerson.preview]);

  // Handle URL parameters for WordPress integration
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clothingUrl = params.get('clothing_url');

    if (clothingUrl) {
      const fetchClothingImage = async () => {
        try {
          // Use a proxy or direct fetch if CORS allows
          // Since we are in a browser, we try to fetch it
          const response = await fetch(clothingUrl);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            setClothingSource({
              file: new File([blob], 'clothing-from-url.png', { type: blob.type }),
              preview: reader.result as string
            });
          };
          reader.readAsDataURL(blob);
        } catch (err) {
          console.error('Failed to fetch clothing image from URL:', err);
          setError('Не вдалося завантажити фото одягу за посиланням. Спробуйте завантажити вручну.');
        }
      };
      fetchClothingImage();
    }
  }, []);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement> | React.DragEvent | ClipboardEvent,
    setter: React.Dispatch<React.SetStateAction<ImageState>>
  ) => {
    let file: File | null = null;

    if ('clipboardData' in e) {
      const items = (e as ClipboardEvent).clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            file = items[i].getAsFile();
            break;
          }
        }
      }
    } else if ('dataTransfer' in e) {
      e.preventDefault();
      file = (e as React.DragEvent).dataTransfer.files[0];
    } else if ('target' in e) {
      file = (e.target as HTMLInputElement).files?.[0] || null;
    }

    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter({ file, preview: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRun = async () => {
    if (!targetPerson.preview || !clothingSource.preview) {
      setError('Будь ласка, додайте обидва зображення.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResultImage(null);

    try {
      const generatedImage = await processImage(
        targetPerson.preview,
        clothingSource.preview,
        options
      );
      
      const watermarkedImage = await addWatermark(generatedImage, "Gidna");
      setResultImage(watermarkedImage);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Сталася помилка під час обробки зображення.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `gidna-result-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
              <Sparkles size={18} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Gidna</h1>
          </div>
          <div className="text-sm text-slate-500 font-medium">
            AI Fashion Studio
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Inputs */}
          <div className="lg:col-span-7 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Target Person Upload */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 uppercase tracking-wider">
                  <User size={14} className="text-emerald-600" />
                  Ваше фото
                </label>
                <ImageUploader 
                  id="target-person"
                  preview={targetPerson.preview}
                  onUpload={(e) => handleImageUpload(e, setTargetPerson)}
                  onFocus={() => setLastFocused('target')}
                  placeholder="Перетягніть або вставте ваше фото"
                />
              </div>

              {/* Clothing Source Upload */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 uppercase tracking-wider">
                  <Shirt size={14} className="text-emerald-600" />
                  Фото одягу
                </label>
                <ImageUploader 
                  id="clothing-source"
                  preview={clothingSource.preview}
                  onUpload={(e) => handleImageUpload(e, setClothingSource)}
                  onFocus={() => setLastFocused('clothing')}
                  placeholder="Перетягніть фото з одягом"
                />
              </div>
            </div>

            {/* Options */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Layout size={20} className="text-emerald-600" />
                Налаштування
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <OptionToggle 
                  label="Переодягнути"
                  active={options.changeClothes}
                  onClick={() => setOptions(prev => ({ ...prev, changeClothes: !prev.changeClothes }))}
                />
                <OptionToggle 
                  label="Замінити фон"
                  active={options.changeBackground}
                  onClick={() => setOptions(prev => ({ ...prev, changeBackground: !prev.changeBackground }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Додатковий сценарій (необов'язково)</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all min-h-[100px]"
                  placeholder="Наприклад: 'Зроби фото в стилі ретро' або 'Додай сонцезахисні окуляри'"
                  value={options.customScenario}
                  onChange={(e) => setOptions(prev => ({ ...prev, customScenario: e.target.value }))}
                />
              </div>

              <button
                onClick={handleRun}
                disabled={isProcessing || !targetPerson.preview || !clothingSource.preview}
                className={`w-full py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg ${
                  isProcessing || !targetPerson.preview || !clothingSource.preview
                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] shadow-emerald-200'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="animate-spin" size={20} />
                    Обробка...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Запустити
                  </>
                )}
              </button>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-xl text-sm font-medium border border-red-100"
                >
                  <AlertCircle size={18} />
                  {error}
                </motion.div>
              )}
            </div>
          </div>

          {/* Right Column: Result */}
          <div className="lg:col-span-5">
            <div className="sticky top-24">
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 aspect-[3/4] relative group">
                {!resultImage && !isProcessing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <ImageIcon size={32} />
                    </div>
                    <p className="font-medium">Результат з'явиться тут</p>
                    <p className="text-xs mt-2">Завантажте фото та натисніть "Запустити"</p>
                  </div>
                )}

                {isProcessing && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                      <Sparkles className="absolute inset-0 m-auto text-emerald-600 animate-pulse" size={24} />
                    </div>
                    <p className="mt-6 font-bold text-slate-700 animate-pulse">Створюємо ваш образ...</p>
                    <p className="text-xs text-slate-400 mt-2">Це може зайняти до 30 секунд</p>
                  </div>
                )}

                {resultImage && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0"
                  >
                    <img 
                      src={resultImage} 
                      alt="Result" 
                      className="w-full h-full object-cover cursor-pointer"
                    />
                  </motion.div>
                )}
              </div>
              
              {resultImage && (
                <div className="mt-4 flex justify-center">
                  <button 
                    onClick={downloadResult}
                    className="text-emerald-600 font-bold flex items-center gap-2 hover:underline"
                  >
                    <Download size={18} />
                    Завантажити фото (Gidna)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-slate-200 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} Gidna AI Fashion Studio. Всі права захищені.</p>
      </footer>
    </div>
  );
}

function ImageUploader({ id, preview, onUpload, onFocus, placeholder }: { 
  id: string, 
  preview: string | null, 
  onUpload: (e: any) => void,
  onFocus?: () => void,
  placeholder: string
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    onUpload(e);
  };

  return (
    <div 
      className={`relative aspect-[3/4] rounded-2xl border-2 border-dashed transition-all overflow-hidden group cursor-pointer outline-none focus:ring-2 focus:ring-emerald-500 ${
        isDragging 
          ? 'border-emerald-500 bg-emerald-50' 
          : preview 
            ? 'border-transparent bg-white' 
            : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      onPaste={(e) => onUpload(e.nativeEvent)}
      onFocus={onFocus}
      tabIndex={0}
    >
      <input 
        type="file" 
        ref={inputRef}
        className="hidden" 
        accept="image/*"
        onChange={onUpload}
      />
      
      {preview ? (
        <>
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="bg-white/90 backdrop-blur-sm p-3 rounded-full text-slate-900 shadow-xl">
              <Upload size={20} />
            </div>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${
            isDragging ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500'
          }`}>
            <Upload size={24} />
          </div>
          <p className="text-sm font-semibold text-slate-600">{placeholder}</p>
          <p className="text-xs text-slate-400 mt-2">JPG, PNG до 10MB</p>
        </div>
      )}
    </div>
  );
}

function OptionToggle({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
        active 
          ? 'border-emerald-500 bg-emerald-50 text-emerald-900' 
          : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
      }`}
    >
      <span className="font-bold text-sm">{label}</span>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
        active ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
      }`}>
        <Check size={14} strokeWidth={3} />
      </div>
    </button>
  );
}
