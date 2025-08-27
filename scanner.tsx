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
const SettingsIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>;
const SearchIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const XIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const WifiOffIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" x2="22" y1="2" y2="22"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M2 8.82a15 15 0 0 1 4.17-2.65"/><path d="M10.66 5c.18-.12.37-.24.57-.35a15 15 0 0 1 5.56-1.54"/><path d="M16.85 8.52a10.97 10.97 0 0 1 2.16-1.31"/><path d="M22 12.38A15 15 0 0 0 18.2 9.2c-.3-.18-.6-.35-.91-.5"/><path d="M5 12.82a10.97 10.97 0 0 0 2.18 1.35"/></svg>;
const CheckCircleIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const AlertTriangleIcon = (p: React.SVGProps<SVGSVGElement>) => <svg {...p} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

// --- App Components ---

const LoadingScreen: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-4">
        <div className="text-center">
            <ScanLineIcon className="w-24 h-24 mx-auto mb-6 text-indigo-400 animate-pulse-strong" />
            <h1 className="text-3xl font-bold mb-4">الماسح الضوئي</h1>
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
        success: CheckCircleIcon, error: AlertTriangleIcon, info: PackageIcon
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

    const handlePasteAndParse = () => {
        const parsed: Partial<FirebaseConfig> = {};
        const keys: (keyof FirebaseConfig)[] = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
        keys.forEach(key => {
            const match = pasteArea.match(new RegExp(`${key}:\\s*"([^"]*)"`));
            if (match && match[1]) parsed[key] = match[1];
        });
        if (Object.keys(parsed).length > 0) setConfig(p => ({ ...p, ...parsed }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(config as FirebaseConfig);
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-gray-800 rounded-2xl shadow-2xl p-8 space-y-6 fade-in">
                <div className="text-center">
                    <ScanLineIcon className="w-16 h-16 mx-auto text-indigo-400" />
                    <h1 className="text-2xl font-bold mt-4">إعدادات الاتصال</h1>
                    <p className="text-gray-400">أدخل بيانات مشروع Firebase للربط مع النظام الرئيسي.</p>
                </div>
                {error && <div className="bg-red-900/50 border border-red-500 text-red-300 p-3 rounded-md text-sm">{error}</div>}
                
                <textarea value={pasteArea} onChange={e => setPasteArea(e.target.value)} placeholder="أو الصق كائن إعدادات Firebase هنا..." className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md h-24 font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" dir="ltr"></textarea>
                <button onClick={handlePasteAndParse} className="w-full py-2 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold">تحليل ولصق</button>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {Object.keys(config).map(k => (
                        <input key={k} value={(config as any)[k] || ''} onChange={e => setConfig(p => ({...p, [k]: e.target.value}))} placeholder={k} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" dir="ltr" required />
                    ))}
                    <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold text-lg">حفظ والاتصال</button>
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
                    <p className="flex justify-between"><span>السعر:</span> <span className="font-bold text-lg text-indigo-400">{currencyFormat(product.price)}</span></p>
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

    useEffect(() => {
        scanSoundRef.current = new Audio("https://cdn.jsdelivr.net/gh/pixel-guy/pixel-assets/scan.mp3");
        codeReaderRef.current = new ZXing.BrowserMultiFormatReader();
        startCamera();
        return () => codeReaderRef.current?.reset();
    }, []);

    const startCamera = useCallback(async () => {
        setError('');
        setIsScanning(true);
        try {
            await codeReaderRef.current.decodeFromVideoDevice(undefined, videoRef.current, (result: any, err: any) => {
                if (result && !scanSuccess) {
                    setScanSuccess(true);
                    scanSoundRef.current?.play();
                    onScan(result.getText());
                    setTimeout(() => setScanSuccess(false), 1500);
                }
            });
        } catch (err: any) {
            setError('فشل تشغيل الكاميرا. يرجى منح الإذن اللازم.');
            setIsScanning(false);
        }
    }, [onScan, scanSuccess]);

    return (
        <div className="h-full w-full bg-black flex items-center justify-center text-center">
            <video ref={videoRef} className="h-full w-full object-cover" playsInline />
            {error && <div className="absolute inset-0 bg-black/70 flex flex-col p-4 justify-center items-center"><AlertTriangleIcon className="w-12 h-12 text-red-400 mb-4"/><p>{error}</p></div>}
            <div className={`absolute inset-0 transition-colors duration-300 ${scanSuccess ? 'bg-green-500/30' : 'bg-transparent'}`} />
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 max-w-sm h-32 border-4 ${scanSuccess ? 'border-green-400 shadow-2xl shadow-green-400/50' : 'border-white/80'} rounded-2xl transition-all duration-300`} />
        </div>
    );
};

const ProductsView: React.FC<{ products: Product[], onProductClick: (p: Product) => void }> = ({ products, onProductClick }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredProducts = useMemo(() => {
        if (!searchTerm) return products;
        const lower = searchTerm.toLowerCase();
        return products.filter(p => p.name.toLowerCase().includes(lower) || p.barcode.includes(lower));
    }, [products, searchTerm]);

    return (
        <div className="p-4 pb-20">
            <div className="relative mb-4">
                <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" placeholder="ابحث..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-lg py-3 px-4 pr-10 focus:ring-2 focus:ring-indigo-500 outline-none"/>
            </div>
            {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredProducts.map(p => (
                        <div key={p.id} onClick={() => onProductClick(p)} className="bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700 cursor-pointer active:scale-95 transition-transform">
                            <h3 className="font-bold text-white truncate">{p.name}</h3>
                            <p className="text-indigo-400 font-semibold">{p.price.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })}</p>
                            <p className="text-sm text-gray-400">المخزون: {p.stock} {p.unit}</p>
                        </div>
                    ))}
                </div>
            ) : (
                 <div className="text-center py-16 text-gray-500">
                    <PackageIcon className="w-16 h-16 mx-auto text-gray-600 mb-2"/>
                    <p>{products.length === 0 ? "لم تتم مزامنة أي منتجات." : "لم يتم العثور على منتجات."}</p>
                </div>
            )}
        </div>
    );
};

const SettingsView: React.FC<{ onClearConfig: () => void }> = ({ onClearConfig }) => {
    const handleClear = () => {
        if(window.confirm('هل أنت متأكد؟ سيؤدي هذا إلى مسح إعدادات الاتصال الحالية.')) {
            onClearConfig();
        }
    };
    return (
        <div className="p-6 space-y-4">
            <h2 className="text-xl font-bold">الإعدادات</h2>
            <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">إعادة ضبط الاتصال</h3>
                <p className="text-sm text-gray-400 mb-4">استخدم هذا الخيار لمسح إعدادات Firebase الحالية والبدء من جديد.</p>
                <button onClick={handleClear} className="w-full py-2 bg-red-800 hover:bg-red-700 rounded-md font-semibold">مسح الإعدادات</button>
            </div>
        </div>
    );
};

const BottomNav: React.FC<{ activePage: Page; onNavigate: (page: Page) => void }> = ({ activePage, onNavigate }) => {
    const navItems = [
        { page: 'scanner' as Page, icon: ScanLineIcon },
        { page: 'products' as Page, icon: PackageIcon },
        { page: 'settings' as Page, icon: SettingsIcon },
    ];
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-sm border-t border-gray-700 flex justify-around h-16 z-10">
            {navItems.map(({ page, icon: Icon }) => (
                <button key={page} onClick={() => onNavigate(page)} className={`flex items-center justify-center w-full transition-colors ${activePage === page ? 'text-indigo-400' : 'text-gray-400 hover:text-indigo-400'}`}>
                    <Icon className="w-8 h-8"/>
                </button>
            ))}
        </nav>
    );
};

const ScannerApp: React.FC<{ onClearConfig: () => void }> = ({ onClearConfig }) => {
    const [activePage, setActivePage] = useState<Page>('scanner');
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [toast, setToast] = useState<ToastMessage | null>(null);

    useEffect(() => {
        const productsRef = firebase.database().ref('syncedData/products');
        productsRef.on('value', (snapshot: any) => {
            const data = snapshot.val();
            if (data && Array.isArray(data)) setProducts(data);
            setIsLoading(false);
        }, (error: any) => {
            console.error(error);
            setIsLoading(false);
            addToast("فشل في مزامنة البيانات.", "error");
        });
        return () => productsRef.off();
    }, []);

    const addToast = (message: string, type: ToastMessage['type']) => {
        setToast({ id: Date.now(), message, type });
    };

    const handleScan = useCallback((code: string) => {
        const product = products.find(p => p.barcode === code);
        if (product) {
            setSelectedProduct(product);
            addToast(`تم العثور على: ${product.name}`, 'success');
        } else {
            addToast(`المنتج بالباركود ${code} غير موجود.`, 'error');
        }
        try {
            firebase.database().ref('barcodeScanner/scannedCode').set({ code, timestamp: Date.now() });
        } catch (e) {
            console.error("Failed to send scan to main app", e);
        }
    }, [products]);

    if (isLoading) return <LoadingScreen text="جاري مزامنة المنتجات..." />;

    const renderPage = () => {
        switch(activePage) {
            case 'scanner': return <ScannerView onScan={handleScan} />;
            case 'products': return <ProductsView products={products} onProductClick={setSelectedProduct} />;
            case 'settings': return <SettingsView onClearConfig={onClearConfig} />;
        }
    };

    return (
        <div className="h-screen w-screen overflow-hidden flex flex-col bg-gray-900">
            <main className="flex-1 overflow-y-auto">{renderPage()}</main>
            <BottomNav activePage={activePage} onNavigate={setActivePage} />
            {selectedProduct && <ProductDetailModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
            {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
        </div>
    );
};

const AppContainer: React.FC = () => {
    const [config, setConfig] = useLocalStorage<FirebaseConfig | null>('scannerFirebaseConfig', null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (config) {
            try {
                if (!firebase.apps.length) firebase.initializeApp(config);
                setIsInitialized(true);
            } catch (e) {
                setError('فشل تهيئة Firebase. تحقق من الإعدادات.');
                setConfig(null);
            }
        }
    }, [config, setConfig]);

    const handleConfigSave = (newConfig: FirebaseConfig) => {
        setConfig(newConfig);
        // Reloading is a simple way to ensure all Firebase connections are reset with the new config
        setTimeout(() => window.location.reload(), 300);
    };

    const handleClearConfig = () => {
        setConfig(null);
        setTimeout(() => window.location.reload(), 300);
    };

    if (!config || !isInitialized) {
        return <ConfigScreen onSave={handleConfigSave} error={error} initialConfig={config} />;
    }

    return <ScannerApp onClearConfig={handleClearConfig} />;
};

// --- Mount Application ---
const rootEl = document.getElementById('root');
if (rootEl) {
    const root = ReactDOM.createRoot(rootEl);
    root.render(<AppContainer />);
}
