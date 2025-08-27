import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom/client';

// --- Declare Globals from CDN ---
declare var firebase: any;
declare var ZXing: any;

// --- Types ---
type Product = { id: string; name: string; price: number; stock: number; barcode: string; cost: number; category: string; unit: string; supplier?: string; };
type FirebaseConfig = { apiKey: string; authDomain: string; databaseURL: string; projectId: string; storageBucket: string; messagingSenderId: string; appId: string; measurementId?: string };
type Page = 'scanner' | 'products' | 'settings';
type ToastMessage = { id: number; message: string; type: 'success' | 'error' | 'info' };

// --- Helper Hooks ---
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) { return initialValue; }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) { console.error(error); }
  }, [key, storedValue]);
  return [storedValue, setStoredValue];
}

// --- Icons ---
const PackageIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.89 1.453a2.2 2.2 0 0 0-1.78 0l-6 3A2.2 2.2 0 0 0 4 6.425v11.15a2.2 2.2 0 0 0 1.11 1.972l6 3a2.2 2.2 0 0 0 1.78 0l6-3a2.2 2.2 0 0 0 1.11-1.972V6.425a2.2 2.2 0 0 0-1.11-1.972l-6-3Z"/><path d="m4.22 6.55 7.78 3.9 7.78-3.9"/><path d="M12 22.42V10.5"/></svg>;
const ScanLineIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg>;
const SettingsIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l-.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0 2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const SearchIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const XIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const WifiOffIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 4.17-2.65"/><path d="M10.66 5c.18-.12.37-.24.57-.35a15 15 0 0 1 5.56-1.54"/><path d="M16.85 8.52a10.97 10.97 0 0 1 2.16-1.31"/><path d="M22 12.38A15 15 0 0 0 18.2 9.2c-.3-.18-.6-.35-.91-.5"/><path d="M5 12.82a10.97 10.97 0 0 0 2.18 1.35"/></svg>;
const CheckCircleIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const AlertTriangleIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const InfoIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;

// --- App Components ---

const LoadingScreen: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-4">
        <div className="text-center">
            <ScanLineIcon className="w-24 h-24 mx-auto mb-6 text-blue-400 animate-pulse-strong" />
            <h1 className="text-3xl font-bold mb-4">الماسح الضوئي | YSK Sales</h1>
            <p className="text-lg text-gray-300">{text}</p>
        </div>
    </div>
);

const Toast: React.FC<{ message: ToastMessage, onDismiss: () => void }> = ({ message, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(onDismiss, 4000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    const colors = {
        success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500'
    };
    const Icon = {
        success: CheckCircleIcon, error: AlertTriangleIcon, info: InfoIcon
    }[message.type];

    return (
        <div className={`fixed top-4 right-4 left-4 md:left-auto md:w-96 p-4 rounded-lg shadow-2xl flex items-center gap-4 text-white z-50 fade-in ${colors[message.type]}`}>
            <Icon className="w-6 h-6 flex-shrink-0" />
            <p className="font-semibold">{message.message}</p>
        </div>
    );
};

const ConfigScreen: React.FC<{ onSave: (config: FirebaseConfig) => void; error?: string; initialConfig?: FirebaseConfig | null }> = ({ onSave, error, initialConfig }) => {
    const [config, setConfig] = useState<Partial<FirebaseConfig>>(initialConfig || { apiKey: '', authDomain: '', databaseURL: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: '' });
    const [pasteArea, setPasteArea] = useState('');
    const [localError, setLocalError] = useState('');

    const handlePasteAndParse = () => {
        setLocalError('');
        const parsed: Partial<FirebaseConfig> = {};
        const keys: (keyof FirebaseConfig)[] = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'];
        keys.forEach(key => {
            const match = pasteArea.match(new RegExp(`${key}:\\s*"([^"]*)"`));
            if (match && match[1]) {
                (parsed as any)[key] = match[1];
            }
        });
        if (Object.keys(parsed).length > 0) {
            setConfig(p => ({ ...p, ...parsed }));
        } else {
            setLocalError('لم يتم العثور على إعدادات صالحة.');
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLocalError('');
        let configToSave = { ...config };

        if (!configToSave.databaseURL || !configToSave.projectId) {
            setLocalError('حقلي databaseURL و projectId مطلوبان.');
            return;
        }

        // Auto-correct common mistakes
        if (!configToSave.databaseURL.startsWith('https://')) {
            configToSave.databaseURL = 'https://' + configToSave.databaseURL;
        }

        if (!/firebaseio\.com|firebasedatabase\.app/.test(configToSave.databaseURL)) {
            configToSave.databaseURL = `https://${configToSave.projectId}.firebaseio.com`;
            setConfig(configToSave); // Update UI to show the correction
        }

        try {
            new URL(configToSave.databaseURL);
        } catch (e) {
            setLocalError('رابط قاعدة البيانات (databaseURL) يبدو غير صالح.');
            return;
        }

        onSave(configToSave as FirebaseConfig);
    };

    const configKeys: (keyof FirebaseConfig)[] = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'];

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-gray-800 rounded-2xl shadow-2xl p-8 space-y-6 fade-in">
                <div className="text-center">
                    <ScanLineIcon className="w-16 h-16 mx-auto text-blue-400" />
                    <h1 className="text-2xl font-bold mt-4">إعدادات الاتصال</h1>
                    <p className="text-gray-400">أدخل بيانات مشروع Firebase للربط مع النظام الرئيسي.</p>
                </div>
                {(error || localError) && <div className="bg-red-900/50 border border-red-500 text-red-300 p-3 rounded-md text-sm">{error || localError}</div>}
                
                <textarea value={pasteArea} onChange={e => setPasteArea(e.target.value)} placeholder="أو الصق كائن إعدادات Firebase هنا..." className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md h-24 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" dir="ltr"></textarea>
                <button onClick={handlePasteAndParse} className="w-full py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold">تحليل ولصق</button>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {configKeys.map(key => (
                        <input 
                            key={key} 
                            value={(config as any)[key] || ''} 
                            onChange={e => { setConfig(p => ({...p, [key]: e.target.value})); setLocalError(''); }} 
                            placeholder={key} 
                            className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                            dir="ltr" 
                            required={key !== 'measurementId'} 
                        />
                    ))}
                    <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold text-lg">حفظ والاتصال</button>
                </form>
            </div>
        </div>
    );
};

const ProductDetailModal: React.FC<{ product: Product; onClose: () => void }> = ({ product, onClose }) => {
    const currencyFormat = (amount: number) => amount.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' });
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 fade-in" onClick={onClose}>
            <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">{product.name}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><XIcon className="w-6 h-6"/></button>
                </div>
                <div className="space-y-3 text-gray-300">
                    <p className="flex justify-between"><span>السعر:</span> <span className="font-bold text-lg text-blue-400">{currencyFormat(product.price)}</span></p>
                    <p className="flex justify-between"><span>التكلفة:</span> <span>{currencyFormat(product.cost)}</span></p>
                    <p className="flex justify-between"><span>المخزون:</span> <span>{product.stock} {product.unit}</span></p>
                    <p className="flex justify-between"><span>الفئة:</span> <span>{product.category}</span></p>
                    <p className="flex justify-between"><span>المورد:</span> <span>{product.supplier || '-'}</span></p>
                    <p className="pt-3 border-t border-gray-700 font-mono text-center text-lg tracking-widest text-gray-400">{product.barcode}</p>
                </div>
            </div>
        </div>
    );
};

const ScannerView: React.FC<{ onScan: (code: string) => void }> = ({ onScan }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const codeReaderRef = useRef<any>(null);
    const [error, setError] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [scanSuccess, setScanSuccess] = useState(false);
    const scanSoundRef = useRef<HTMLAudioElement | null>(null);

    const startCamera = useCallback(async () => {
        setError('');
        setIsScanning(true);
        try {
            await codeReaderRef.current.decodeFromVideoDevice(undefined, videoRef.current, (result: any, err: any) => {
                if (result) {
                    setScanSuccess(alreadyScanned => {
                        if (!alreadyScanned) {
                            scanSoundRef.current?.play();
                            onScan(result.getText());
                            setTimeout(() => setScanSuccess(false), 1500);
                            return true;
                        }
                        return alreadyScanned;
                    });
                }
            });
        } catch (err: any) {
            setError('فشل تشغيل الكاميرا. تأكد من وجود كاميرا وتفعيل الأذونات.');
            setIsScanning(false);
            console.error(err);
        }
    }, [onScan]);

    useEffect(() => {
        scanSoundRef.current = new Audio("https://cdn.jsdelivr.net/gh/pixel-guy/pixel-assets/scan.mp3");
        codeReaderRef.current = new ZXing.BrowserMultiFormatReader();
        startCamera();
        return () => codeReaderRef.current?.reset();
    }, [startCamera]);

    return (
        <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/4 max-w-sm h-1/2 relative">
                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white/50 rounded-tl-lg"></div>
                    <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white/50 rounded-tr-lg"></div>
                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white/50 rounded-bl-lg"></div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white/50 rounded-br-lg"></div>
                    {isScanning && !scanSuccess && (
                        <div className="absolute top-1/2 left-2 right-2 h-1 bg-red-500/70 rounded-full shadow-[0_0_10px_2px_rgba(239,68,68,0.7)] animate-pulse"></div>
                    )}
                </div>
            </div>

            {scanSuccess && (
                <div className="absolute inset-0 bg-green-500/50 flex items-center justify-center">
                    <CheckCircleIcon className="w-20 h-20 text-white" />
                </div>
            )}

            {error && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-4">
                    <AlertTriangleIcon className="w-12 h-12 text-red-400 mb-3" />
                    <p className="text-white text-lg mb-4">{error}</p>
                    <button onClick={startCamera} className="px-5 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700">
                        أعد المحاولة
                    </button>
                </div>
            )}

            {!isScanning && !error && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <p className="text-white text-lg animate-pulse">جاري بدء الكاميرا...</p>
                </div>
            )}
        </div>
    );
};

const ProductListScreen: React.FC<{ products: Product[]; onSelect: (product: Product) => void }> = ({ products, onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredProducts = useMemo(() => 
        products.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.barcode.includes(searchTerm)
        ), [products, searchTerm]);

    return (
        <div className="p-4 flex flex-col h-full">
            <div className="relative mb-4">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="ابحث بالاسم أو الباركود..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-4 pl-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
            </div>
            <div className="flex-grow overflow-y-auto -mx-4 px-4">
                <div className="space-y-2">
                    {filteredProducts.map(p => (
                        <div key={p.id} onClick={() => onSelect(p)} className="bg-gray-800 p-3 rounded-lg flex justify-between items-center cursor-pointer hover:bg-gray-700 transition-colors">
                            <div>
                                <h3 className="font-semibold">{p.name}</h3>
                                <p className="text-sm text-gray-400 font-mono">{p.barcode}</p>
                            </div>
                            <span className="text-lg font-bold text-blue-400">{p.stock}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    const [page, setPage] = useState<Page>('scanner');
    const [products, setProducts] = useState<Product[]>([]);
    const [firebaseConfig, setFirebaseConfig] = useLocalStorage<FirebaseConfig | null>('scannerFirebaseConfig', null);
    const [firebaseError, setFirebaseError] = useState('');
    const [isFirebaseReady, setIsFirebaseReady] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingText, setLoadingText] = useState('جاري التحقق من الإعدادات...');
    const [toast, setToast] = useState<ToastMessage | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const showToast = (message: string, type: ToastMessage['type']) => {
        setToast({ id: Date.now(), message, type });
    };

    const initializeFirebase = useCallback((config: FirebaseConfig) => {
        setLoadingText('جاري الاتصال بقاعدة البيانات...');
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(config);
            }
            setFirebaseError('');
            setIsFirebaseReady(true);
        } catch (e: any) {
            console.error("Firebase init failed", e);
            setFirebaseError(`فشل الاتصال: ${e.message}`);
            setIsFirebaseReady(false);
            setFirebaseConfig(null);
            setIsLoading(false);
        }
    }, [setFirebaseConfig]);

    useEffect(() => {
        if (firebaseConfig) {
            initializeFirebase(firebaseConfig);
        } else {
            setIsLoading(false);
        }
    }, [firebaseConfig, initializeFirebase]);

    useEffect(() => {
        if (!isFirebaseReady) return;
        
        setLoadingText('جاري مزامنة بيانات المنتجات...');
        const db = firebase.database();
        const productsRef = db.ref('syncedData/products');
        
        const listener = productsRef.on('value', (snapshot: any) => {
            const data = snapshot.val();
            if (data && Array.isArray(data)) {
                setProducts(data);
                if (isLoading) showToast('تمت مزامنة المنتجات بنجاح!', 'success');
            }
            setIsLoading(false);
        }, (error: any) => {
            console.error("Firebase read failed", error);
            setFirebaseError('فشل في قراءة البيانات. تحقق من أذونات قاعدة البيانات.');
            setIsLoading(false);
        });

        return () => productsRef.off('value', listener);
    }, [isFirebaseReady, isLoading]);

    const handleScan = (code: string) => {
        const db = firebase.database();
        db.ref('barcodeScanner/scannedCode').set({
            code: code,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        const product = products.find(p => p.barcode === code);
        if(product) {
            showToast(`تم العثور على: ${product.name}`, 'success');
            setSelectedProduct(product);
        } else {
            showToast(`تم إرسال الكود: ${code}`, 'info');
        }
    };

    if (isLoading) {
        return <LoadingScreen text={loadingText} />;
    }
    
    if (!firebaseConfig || !isFirebaseReady) {
        return <ConfigScreen onSave={setFirebaseConfig} error={firebaseError} initialConfig={firebaseConfig} />;
    }
    
    const renderPage = () => {
        switch (page) {
            case 'scanner': return <ScannerView onScan={handleScan} />;
            case 'products': return <ProductListScreen products={products} onSelect={setSelectedProduct} />;
            case 'settings': return <ConfigScreen onSave={setFirebaseConfig} initialConfig={firebaseConfig} />;
            default: return null;
        }
    };

    return (
        <div className="h-screen bg-gray-900 text-white flex flex-col font-sans">
            {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
            {selectedProduct && <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}

            <header className="flex-shrink-0 bg-gray-800/80 backdrop-blur-sm p-4 flex justify-between items-center border-b border-gray-700">
                 <div className="flex items-center gap-3">
                    <ScanLineIcon className="w-8 h-8 text-blue-400" />
                    <h1 className="text-xl font-bold">الماسح الضوئي | YSK Sales</h1>
                </div>
                {isFirebaseReady ? 
                    <div className="flex items-center gap-2 text-green-400 text-sm"><CheckCircleIcon className="w-5 h-5"/> متصل</div> :
                    <div className="flex items-center gap-2 text-red-400 text-sm"><WifiOffIcon className="w-5 h-5"/> غير متصل</div>
                }
            </header>
            
            <main className="flex-grow overflow-y-auto">
                {renderPage()}
            </main>

            <footer className="flex-shrink-0 bg-gray-800/80 backdrop-blur-sm grid grid-cols-3 border-t border-gray-700">
                <button onClick={() => setPage('products')} className={`py-3 flex flex-col items-center justify-center gap-1 hover:bg-gray-700/50 ${page === 'products' ? 'text-blue-400' : 'text-gray-400'}`}><PackageIcon className="w-6 h-6"/> <span className="text-xs font-semibold">المنتجات</span></button>
                <button onClick={() => setPage('scanner')} className={`py-3 flex flex-col items-center justify-center gap-1 hover:bg-gray-700/50 ${page === 'scanner' ? 'text-blue-400' : 'text-gray-400'}`}><ScanLineIcon className="w-6 h-6"/> <span className="text-xs font-semibold">المسح الضوئي</span></button>
                <button onClick={() => setPage('settings')} className={`py-3 flex flex-col items-center justify-center gap-1 hover:bg-gray-700/50 ${page === 'settings' ? 'text-blue-400' : 'text-gray-400'}`}><SettingsIcon className="w-6 h-6"/> <span className="text-xs font-semibold">الإعدادات</span></button>
            </footer>
        </div>
    );
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
