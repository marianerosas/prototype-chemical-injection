
import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { User, Tank, Well, Association, Site, Product, Pump } from './types';
import { getSystemInsights } from './services/geminiService';

// --- MOCK DATA ---
const MOCK_SITES: Site[] = [
  { id: 'S1', name: 'Permian Alpha', location: 'Texas' },
  { id: 'S2', name: 'Bakken Bravo', location: 'North Dakota' },
];

const INITIAL_PRODUCTS: Product[] = [
  { id: 'P1', name: 'Product A' },
  { id: 'P2', name: 'Product B' },
  { id: 'P3', name: 'Product C' },
  { id: 'P4', name: 'Product D' },
  { id: 'P5', name: 'Corrosion Inhibitor' },
  { id: 'P6', name: 'Scale Inhibitor' },
];

const INITIAL_TANKS: Tank[] = [
  { id: 'T1', name: 'TK-101', siteId: 'S1', capacity: 2000, material: 'Stainless Steel', currentVolume: 1200, lastUpdated: new Date().toISOString(), chemicalType: 'Product A' },
  { id: 'T2', name: 'TK-102', siteId: 'S1', capacity: 1500, material: 'Polyethylene', currentVolume: 300, lastUpdated: new Date().toISOString(), chemicalType: 'Corrosion Inhibitor' }, // Low volume
  { id: 'T3', name: 'TK-201', siteId: 'S2', capacity: 5000, material: 'Carbon Steel', currentVolume: 4500, lastUpdated: new Date().toISOString(), chemicalType: 'Product C' },
];

const INITIAL_PUMPS: Pump[] = [
    { id: 'PM1', name: 'P-101-A', tankId: 'T1', maxRate: 20 },
    { id: 'PM2', name: 'P-102-A', tankId: 'T2', maxRate: 15 },
    { id: 'PM3', name: 'P-201-A', tankId: 'T3', maxRate: 50 },
];

const INITIAL_WELLS: Well[] = [
  { id: 'W1', name: 'Well-A1', siteId: 'S1', productionRate: 500 },
  { id: 'W2', name: 'Well-A2', siteId: 'S1', productionRate: 1200 },
  { id: 'W3', name: 'Well-B1', siteId: 'S2', productionRate: 800 },
];

const INITIAL_ASSOCS: Association[] = [
  { id: 'A1', wellId: 'W1', tankId: 'T1', pumpId: 'PM1', targetPpm: 150, status: 'ACTIVE' },
  { id: 'A2', wellId: 'W2', tankId: 'T2', pumpId: 'PM2', targetPpm: 50, status: 'INACTIVE' },
];

// --- COMPONENTS ---

const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = "", title }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-slate-200 ${className}`}>
    {title && <div className="px-6 py-4 border-b border-slate-100 font-semibold text-slate-700">{title}</div>}
    <div className="p-6">{children}</div>
  </div>
);

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' }> = ({ children, className = "", variant = 'primary', ...props }) => {
  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-800",
    secondary: "bg-slate-600 text-white hover:bg-slate-700",
    danger: "bg-red-500 text-white hover:bg-red-600",
    success: "bg-green-500 text-white hover:bg-green-600",
    outline: "border border-slate-300 text-slate-700 hover:bg-slate-50"
  };
  return (
    <button className={`px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, className = "", ...props }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <input className={`w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 ${className}`} {...props} />
  </div>
);

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }> = ({ label, children, className = "", ...props }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <select className={`w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white ${className}`} {...props}>
      {children}
    </select>
  </div>
);

const AccessDenied = () => (
  <div className="flex flex-col items-center justify-center h-96 text-slate-400">
    <i className="fas fa-lock text-6xl mb-4"></i>
    <h2 className="text-xl font-bold">Access Denied</h2>
    <p>Only Sales team members can access this section.</p>
  </div>
);

// --- MAIN APP ---

export default function App() {
  // Global State
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tanks' | 'wells' | 'products' | 'associate'>('dashboard');
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [tanks, setTanks] = useState<Tank[]>(INITIAL_TANKS);
  const [pumps, setPumps] = useState<Pump[]>(INITIAL_PUMPS);
  const [wells, setWells] = useState<Well[]>(INITIAL_WELLS);
  const [associations, setAssociations] = useState<Association[]>(INITIAL_ASSOCS);
  const [insights, setInsights] = useState<string>('');
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Derived State for Validation Rules
  const validateAssociationCreation = (wellId: string, tankId: string, pumpId: string): string | null => {
    const targetWell = wells.find(w => w.id === wellId);
    const targetTank = tanks.find(t => t.id === tankId);
    if (!targetWell || !targetTank || !pumpId) return "Invalid selection";

    // REMOVED: Check if pump is already assigned (Single pump can now feed multiple wells)

    const existingAssocs = associations.filter(a => a.wellId === wellId);
    
    // Rule: Max 3 chemicals (Active or Inactive - standard equipment limit)
    // Actually, prompt says "System should not allow more than 3 chemicals to be injected". 
    // We'll treat this as a physical setup limit for now.
    const connectedTanks = existingAssocs.map(a => tanks.find(t => t.id === a.tankId)).filter(t => t !== undefined) as Tank[];
    const uniqueChemicals = new Set([...connectedTanks.map(t => t.chemicalType), targetTank.chemicalType]);
    
    if (uniqueChemicals.size > 3) return "Maximum 3 different chemicals allowed per well.";
    
    // We allow associating A and C, but we will block them from RUNNING at the same time in the toggle function.
    
    return null; // Valid
  };

  const validateToggleStatus = (association: Association): string | null => {
      // We are trying to turn ON this association
      if (association.status === 'ACTIVE') return null; // Turning off is always safe

      const wellId = association.wellId;
      const thisTank = tanks.find(t => t.id === association.tankId);
      if (!thisTank) return "Tank not found";

      const thisChemical = thisTank.chemicalType;
      
      // Find other ACTIVE associations for this well
      const activeAssocs = associations.filter(a => a.wellId === wellId && a.status === 'ACTIVE' && a.id !== association.id);
      const activeChemicals = activeAssocs.map(a => tanks.find(t => t.id === a.tankId)?.chemicalType);

      // Rule: Product A and C incompatibility
      const hasA = activeChemicals.includes('Product A') || thisChemical === 'Product A';
      const hasC = activeChemicals.includes('Product C') || thisChemical === 'Product C';

      if (hasA && hasC) {
          return "Safety Interlock: Cannot run Product A and Product C simultaneously on this well.";
      }

      return null;
  };

  // --- SUB-SCREENS ---

  const LoginScreen = () => (
    <div className="min-h-screen flex items-center justify-center bg-brand-50">
      <Card className="w-full max-w-md p-8" title="ChemFlow Login">
        <p className="mb-6 text-slate-600">Select a role to enter the prototype.</p>
        <div className="space-y-4">
          <button 
            onClick={() => setUser({ id: 'u1', name: 'Sarah Sales', role: 'SALES' })}
            className="w-full p-4 border border-slate-200 rounded-lg hover:border-brand-500 hover:bg-brand-50 flex items-center justify-between group transition-all"
          >
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-full mr-4 text-brand-600">
                <i className="fas fa-chart-line"></i>
              </div>
              <div className="text-left">
                <h3 className="font-bold text-slate-800">Sales Team</h3>
                <p className="text-sm text-slate-500">Full access to registration & reports</p>
              </div>
            </div>
            <i className="fas fa-arrow-right text-slate-300 group-hover:text-brand-500"></i>
          </button>

          <button 
             onClick={() => setUser({ id: 'u2', name: 'Frank Field', role: 'FIELD_TECH' })}
             className="w-full p-4 border border-slate-200 rounded-lg hover:border-brand-500 hover:bg-brand-50 flex items-center justify-between group transition-all"
          >
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-full mr-4 text-green-600">
                <i className="fas fa-hard-hat"></i>
              </div>
               <div className="text-left">
                <h3 className="font-bold text-slate-800">Field Technician</h3>
                <p className="text-sm text-slate-500">Can associate equipment only</p>
              </div>
            </div>
            <i className="fas fa-arrow-right text-slate-300 group-hover:text-brand-500"></i>
          </button>
        </div>
      </Card>
    </div>
  );

  const Dashboard = () => {
    // Simulated Data Generation for Charts
    const chartData = useMemo(() => {
      return Array.from({ length: 24 }, (_, i) => ({
        time: `${i}:00`,
        injectionRate: 5 + Math.random() * 2, // Random fluctuation around 5 L/hr
        volume: 1200 - (i * 5)
      }));
    }, []);

    const consumptionData = useMemo(() => {
        return wells.map(w => {
            const wellAssocs = associations.filter(a => a.wellId === w.id && a.status === 'ACTIVE');
            // Calculate consumption based on all chemicals injected
            const totalPpm = wellAssocs.reduce((acc, curr) => acc + curr.targetPpm, 0);
            const estConsumption = (w.productionRate * totalPpm) / 10000; 
            return {
                name: w.name,
                consumption: parseFloat(estConsumption.toFixed(2))
            };
        });
    }, [wells, associations]);

    const handleGenerateInsights = async () => {
        setLoadingInsights(true);
        const text = await getSystemInsights(tanks, wells, associations);
        setInsights(text);
        setLoadingInsights(false);
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">System Overview</h2>
            <Button onClick={handleGenerateInsights} disabled={loadingInsights}>
                {loadingInsights ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-robot mr-2"></i>}
                AI Analysis
            </Button>
        </div>

        {insights && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                <h3 className="text-indigo-800 font-bold mb-2 flex items-center">
                    <i className="fas fa-sparkles mr-2"></i> Gemini Insights
                </h3>
                <div className="prose prose-sm text-indigo-900 whitespace-pre-line">
                    {insights}
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Tank T1 Injection Rate (Active)">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis label={{ value: 'L/hr', angle: -90, position: 'insideLeft' }} />
                  <ChartTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="injectionRate" stroke="#0ea5e9" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Est. Active Chemical Consumption (L/day)">
             <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={consumptionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'L/day', angle: -90, position: 'insideLeft' }} />
                  <ChartTooltip />
                  <Bar dataKey="consumption" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tanks.map(tank => {
                const tankPumps = pumps.filter(p => p.tankId === tank.id);
                return (
                <Card key={tank.id} className="relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-bold text-lg">{tank.name}</h3>
                            <p className="text-sm text-slate-500">{tank.chemicalType}</p>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-bold ${tank.currentVolume / tank.capacity < 0.2 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {((tank.currentVolume / tank.capacity) * 100).toFixed(0)}%
                        </div>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full mb-2">
                        <div 
                            className={`h-2 rounded-full ${tank.currentVolume / tank.capacity < 0.2 ? 'bg-red-500' : 'bg-brand-500'}`} 
                            style={{ width: `${(tank.currentVolume / tank.capacity) * 100}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600 mb-2">
                        <span>{tank.currentVolume} L</span>
                        <span>Cap: {tank.capacity} L</span>
                    </div>
                    <div className="text-xs text-slate-400 border-t pt-2">
                        {tankPumps.length} Pump(s) Installed
                    </div>
                </Card>
            )})}
        </div>
      </div>
    );
  };

  const ProductRegistrationScreen = () => {
    const [productName, setProductName] = useState('');

    if (user?.role !== 'SALES') return <AccessDenied />;

    const handleAddProduct = (e: React.FormEvent) => {
        e.preventDefault();
        if (!productName.trim()) return;
        
        const newProduct: Product = {
            id: `P${Date.now()}`,
            name: productName
        };
        setProducts([...products, newProduct]);
        setProductName('');
        alert('Product registered successfully!');
    };

    const handleDeleteProduct = (id: string) => {
        if (confirm('Are you sure you want to delete this product? It may affect existing tanks.')) {
            setProducts(products.filter(p => p.id !== id));
        }
    };

    return (
        <div className="space-y-8">
            <Card title="Register New Chemical Product">
                <form onSubmit={handleAddProduct} className="flex gap-4 items-end">
                    <div className="flex-1">
                        <Input 
                            label="Product Name" 
                            value={productName} 
                            onChange={e => setProductName(e.target.value)}
                            placeholder="e.g. Super Solvent X" 
                            className="mb-0"
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <Button type="submit">Add Product</Button>
                    </div>
                </form>
            </Card>

            <Card title="Registered Products Library">
                <div className="overflow-hidden">
                    <table className="min-w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3">Product Name</th>
                                <th className="px-4 py-3">ID</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(p => (
                                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="px-4 py-3 font-medium">{p.name}</td>
                                    <td className="px-4 py-3 text-slate-400">{p.id}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button 
                                            onClick={() => handleDeleteProduct(p.id)}
                                            className="text-red-400 hover:text-red-600"
                                            title="Remove Product"
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
  };

  const RegistrationScreens = () => {
    // Tank & Pump merged form state
    const [tankForm, setTankForm] = useState<{
        name: string;
        siteId: string;
        capacity: string;
        material: string;
        chemicalType: string;
        pumpName: string;
        pumpMaxRate: string;
    }>({ 
        name: '',
        siteId: MOCK_SITES[0].id, 
        capacity: '',
        material: '',
        chemicalType: products[0]?.name || '',
        pumpName: '',
        pumpMaxRate: ''
    });
    
    const [wellForm, setWellForm] = useState<Partial<Well>>({ siteId: MOCK_SITES[0].id });

    if (user?.role !== 'SALES') return <AccessDenied />;

    const handleAddTank = (e: React.FormEvent) => {
        e.preventDefault();
        const newTankId = `T${Date.now()}`;
        
        const newTank: Tank = {
            id: newTankId,
            name: tankForm.name,
            siteId: tankForm.siteId,
            capacity: Number(tankForm.capacity),
            material: tankForm.material,
            currentVolume: Number(tankForm.capacity), // Start full by default for prototype
            lastUpdated: new Date().toISOString(),
            chemicalType: tankForm.chemicalType
        };
        setTanks([...tanks, newTank]);

        // Register Pump if provided
        if (tankForm.pumpName) {
             const newPump: Pump = {
                id: `PM${Date.now()}`,
                name: tankForm.pumpName,
                tankId: newTankId,
                maxRate: Number(tankForm.pumpMaxRate) || 0
            };
            setPumps(prev => [...prev, newPump]);
        }
        
        alert("Tank and Pump registered successfully!");
        // Reset form
        setTankForm({ 
            name: '',
            siteId: MOCK_SITES[0].id, 
            capacity: '',
            material: '',
            chemicalType: products[0]?.name || '',
            pumpName: '',
            pumpMaxRate: ''
        }); 
    };

    const handleAddWell = (e: React.FormEvent) => {
        e.preventDefault();
        const newWell: Well = {
            ...wellForm as Well,
            id: `W${Date.now()}`
        };
        setWells([...wells, newWell]);
        alert("Well registered successfully!");
        setWellForm({ siteId: MOCK_SITES[0].id });
    };

    return (
      <div className="space-y-8">
        {activeTab === 'tanks' && (
            <Card title="Register New Tank">
                <form onSubmit={handleAddTank} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Tank Details Section */}
                    <div className="md:col-span-2">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Tank Details</h4>
                    </div>

                    <Input 
                        label="Tank Name" 
                        required 
                        value={tankForm.name} 
                        onChange={e => setTankForm({...tankForm, name: e.target.value})} 
                        placeholder="e.g. TK-505"
                    />
                    <Select 
                        label="Site" 
                        value={tankForm.siteId} 
                        onChange={e => setTankForm({...tankForm, siteId: e.target.value})}
                    >
                        {MOCK_SITES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                    <Input 
                        label="Capacity (Liters)" 
                        type="number" 
                        required
                        value={tankForm.capacity} 
                        onChange={e => setTankForm({...tankForm, capacity: e.target.value})} 
                    />
                    <Input 
                        label="Material" 
                        required
                        value={tankForm.material} 
                        onChange={e => setTankForm({...tankForm, material: e.target.value})} 
                        placeholder="e.g. Stainless Steel"
                    />
                    <Select 
                        label="Chemical Product"
                        value={tankForm.chemicalType}
                        onChange={e => setTankForm({...tankForm, chemicalType: e.target.value})}
                    >
                        {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </Select>

                    {/* Pump Details Section */}
                    <div className="md:col-span-2 mt-4">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-2">Integrated Pump Details</h4>
                    </div>

                    <Input 
                        label="Pump Name" 
                        value={tankForm.pumpName} 
                        onChange={e => setTankForm({...tankForm, pumpName: e.target.value})} 
                        placeholder="e.g. P-101-A"
                    />
                    <Input 
                        label="Max Rate (L/hr)" 
                        type="number" 
                        value={tankForm.pumpMaxRate} 
                        onChange={e => setTankForm({...tankForm, pumpMaxRate: e.target.value})} 
                    />

                    <div className="md:col-span-2 flex justify-end mt-2">
                        <Button type="submit">Register Tank & Pump</Button>
                    </div>
                </form>
            </Card>
        )}

        {activeTab === 'wells' && (
            <Card title="Register New Well">
            <form onSubmit={handleAddWell} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                    label="Well Name" 
                    required 
                    value={wellForm.name || ''} 
                    onChange={e => setWellForm({...wellForm, name: e.target.value})} 
                    placeholder="e.g. Well-X99"
                />
                <Select 
                    label="Site" 
                    value={wellForm.siteId} 
                    onChange={e => setWellForm({...wellForm, siteId: e.target.value})}
                >
                    {MOCK_SITES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
                <Input 
                    label="Production Rate (bpd)" 
                    type="number" 
                    required
                    value={wellForm.productionRate || ''} 
                    onChange={e => setWellForm({...wellForm, productionRate: Number(e.target.value)})} 
                />
                <div className="md:col-span-2 flex justify-end mt-2">
                    <Button type="submit">Register Well</Button>
                </div>
            </form>
            </Card>
        )}
      </div>
    );
  };

  const AssociationScreen = () => {
    const [selectedWell, setSelectedWell] = useState<string>('');
    const [selectedTank, setSelectedTank] = useState<string>('');
    const [selectedPump, setSelectedPump] = useState<string>('');
    const [ppm, setPpm] = useState<number>(100);
    const [error, setError] = useState<string | null>(null);

    const handleAssociate = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const validationError = validateAssociationCreation(selectedWell, selectedTank, selectedPump);
        if (validationError) {
            setError(validationError);
            return;
        }

        const newAssoc: Association = {
            id: `A${Date.now()}`,
            wellId: selectedWell,
            tankId: selectedTank,
            pumpId: selectedPump,
            targetPpm: ppm,
            status: 'INACTIVE' // Default to Inactive for safety
        };

        setAssociations([...associations, newAssoc]);
        setSelectedTank('');
        setSelectedPump('');
        alert("Association created successfully! Pump is currently STOPPED.");
    };

    const handleRemoveAssoc = (id: string) => {
        setAssociations(associations.filter(a => a.id !== id));
    };

    const toggleStatus = (assocId: string) => {
        setError(null);
        setAssociations(prev => prev.map(a => {
            if (a.id === assocId) {
                if (a.status === 'INACTIVE') {
                    // Trying to START
                    const validationErr = validateToggleStatus(a);
                    if (validationErr) {
                        setError(validationErr);
                        return a; // Don't change status
                    }
                    return { ...a, status: 'ACTIVE' };
                } else {
                    // Stopping is always safe
                    return { ...a, status: 'INACTIVE' };
                }
            }
            return a;
        }));
    };

    // Filter pumps based on selected tank
    const availablePumps = pumps.filter(p => p.tankId === selectedTank);

    return (
        <div className="space-y-8">
            <Card title="Create Association">
                <form onSubmit={handleAssociate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Select label="Select Well" value={selectedWell} onChange={e => setSelectedWell(e.target.value)} required>
                            <option value="">-- Choose Well --</option>
                            {wells.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </Select>

                        <Select label="Select Tank" value={selectedTank} onChange={e => { setSelectedTank(e.target.value); setSelectedPump(''); }} required>
                            <option value="">-- Choose Tank --</option>
                            {tanks.filter(t => {
                                // Filter tanks by same site
                                if (!selectedWell) return true;
                                const well = wells.find(w => w.id === selectedWell);
                                return t.siteId === well?.siteId;
                            }).map(t => (
                                <option key={t.id} value={t.id}>{t.name} ({t.chemicalType})</option>
                            ))}
                        </Select>

                         <Select label="Select Pump" value={selectedPump} onChange={e => setSelectedPump(e.target.value)} required disabled={!selectedTank}>
                            <option value="">-- Choose Pump --</option>
                            {availablePumps.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </Select>

                        <Input label="Target PPM" type="number" value={ppm} onChange={e => setPpm(Number(e.target.value))} required min="1" />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-100 text-red-700 rounded border border-red-200 flex items-center">
                            <i className="fas fa-exclamation-circle mr-2"></i>
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button type="submit" disabled={!selectedWell || !selectedTank || !selectedPump}>Link Equipment</Button>
                    </div>
                </form>
            </Card>

            <Card title="Existing Associations & Pump Control">
                {associations.length === 0 ? <p className="text-slate-500 italic">No active associations.</p> : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3">Well</th>
                                    <th className="px-4 py-3">Tank</th>
                                    <th className="px-4 py-3">Pump</th>
                                    <th className="px-4 py-3">Chemical</th>
                                    <th className="px-4 py-3">PPM</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {associations.map(a => {
                                    const w = wells.find(well => well.id === a.wellId);
                                    const t = tanks.find(tank => tank.id === a.tankId);
                                    const p = pumps.find(pump => pump.id === a.pumpId);
                                    return (
                                        <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium">{w?.name}</td>
                                            <td className="px-4 py-3">{t?.name}</td>
                                            <td className="px-4 py-3 text-slate-500">{p?.name || 'Unknown'}</td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                                    {t?.chemicalType}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">{a.targetPpm}</td>
                                            <td className="px-4 py-3">
                                                 <span className={`px-2 py-1 rounded-full text-xs font-bold ${a.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {a.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 flex space-x-2">
                                                <button 
                                                    onClick={() => toggleStatus(a.id)}
                                                    className={`px-3 py-1 rounded text-xs font-bold text-white transition-colors ${a.status === 'ACTIVE' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'}`}
                                                >
                                                    {a.status === 'ACTIVE' ? 'STOP' : 'START'}
                                                </button>
                                                <button onClick={() => handleRemoveAssoc(a.id)} className="text-red-500 hover:text-red-700 px-2">
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
  };

  // --- RENDER ---

  if (!user) return <LoginScreen />;

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-lg">
        <div className="p-6 border-b border-slate-700">
            <h1 className="text-2xl font-bold text-white tracking-tight">ChemFlow</h1>
            <p className="text-xs text-slate-400 mt-1">Injection Management</p>
        </div>
        
        <div className="p-6 border-b border-slate-800">
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-lg">
                    {user.name.charAt(0)}
                </div>
                <div>
                    <p className="text-sm font-semibold text-white">{user.name}</p>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">{user.role.replace('_', ' ')}</p>
                </div>
            </div>
            <button onClick={() => setUser(null)} className="mt-4 text-xs text-red-400 hover:text-red-300 flex items-center">
                <i className="fas fa-sign-out-alt mr-1"></i> Logout
            </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
            <button 
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-brand-600 text-white' : 'hover:bg-slate-800'}`}
            >
                <i className="fas fa-tachometer-alt w-6"></i> Dashboard
            </button>
            <button 
                onClick={() => setActiveTab('associate')}
                className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'associate' ? 'bg-brand-600 text-white' : 'hover:bg-slate-800'}`}
            >
                <i className="fas fa-link w-6"></i> Associations
            </button>
            <div className="pt-4 pb-2 text-xs font-bold uppercase text-slate-500 tracking-wider">Registration</div>
            <button 
                onClick={() => setActiveTab('products')}
                disabled={user.role !== 'SALES'}
                className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'products' ? 'bg-brand-600 text-white' : 'hover:bg-slate-800'} ${user.role !== 'SALES' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <i className="fas fa-flask w-6"></i> Products
                {user.role !== 'SALES' && <i className="fas fa-lock ml-auto text-xs"></i>}
            </button>
            <button 
                onClick={() => setActiveTab('tanks')}
                disabled={user.role !== 'SALES'}
                className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'tanks' ? 'bg-brand-600 text-white' : 'hover:bg-slate-800'} ${user.role !== 'SALES' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <i className="fas fa-drum-steelpan w-6"></i> Tanks
                {user.role !== 'SALES' && <i className="fas fa-lock ml-auto text-xs"></i>}
            </button>
            <button 
                onClick={() => setActiveTab('wells')}
                disabled={user.role !== 'SALES'}
                className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeTab === 'wells' ? 'bg-brand-600 text-white' : 'hover:bg-slate-800'} ${user.role !== 'SALES' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <i className="fas fa-oil-well w-6"></i> Wells
                {user.role !== 'SALES' && <i className="fas fa-lock ml-auto text-xs"></i>}
            </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        <header className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800">
                {activeTab === 'dashboard' && 'Operations Dashboard'}
                {activeTab === 'associate' && 'Equipment Associations'}
                {activeTab === 'tanks' && 'Tank & Pump Registration'}
                {activeTab === 'wells' && 'Well Registration'}
                {activeTab === 'products' && 'Chemical Products Library'}
            </h1>
            <div className="text-sm text-slate-500">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
        </header>

        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'associate' && <AssociationScreen />}
        {activeTab === 'products' && <ProductRegistrationScreen />}
        {(activeTab === 'tanks' || activeTab === 'wells') && <RegistrationScreens />}
      </main>
    </div>
  );
}
