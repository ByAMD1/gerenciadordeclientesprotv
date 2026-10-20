import React, { useState, useEffect, useMemo } from 'react';
import { 
    UserPlus, Settings, Database, MessageCircle, CheckCircle2, Trash2, Edit2, Download, 
    Upload, AlertCircle, X, Check, FileDown, FileUp, Calendar, DollarSign, Smartphone, 
    User, Bell, Search, TrendingUp, Clock, AlertTriangle, Copy, ShieldCheck, 
    Tv
} from 'lucide-react';

export default function App() {
    // --- ESTADOS COM LOCALSTORAGE (Gravação Offline) ---
    const [clients, setClients] = useState(() => {
        const savedClients = localStorage.getItem('gerenciador_pro_clients');
        return savedClients ? JSON.parse(savedClients) : [];
    });

    const [monthlyRevenue, setMonthlyRevenue] = useState(() => {
        const savedRevenue = localStorage.getItem('gerenciador_pro_revenue');
        return savedRevenue ? JSON.parse(savedRevenue) : [];
    });

    const [pixKey, setPixKey] = useState(() => {
        return localStorage.getItem('gerenciador_pro_pix') || '';
    });

    const [notificationTime, setNotificationTime] = useState(() => {
        return localStorage.getItem('gerenciador_pro_time') || '09:00';
    });

    const [activeTab, setActiveTab] = useState('clients'); 
    
    // UI state
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); 
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [toast, setToast] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null);
    const [copiedPix, setCopiedPix] = useState(false);

    // Client Form State
    const [formData, setFormData] = useState({
        name: '', phone: '', amount: '', dueDate: '', service: '', notes: ''
    });

    // --- FUNÇÕES DE CÁLCULO E FORMATAÇÃO ---
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const getDaysDifference = (dueDateStr) => {
        if (!dueDateStr) return 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [year, month, day] = dueDateStr.split('-').map(Number);
        const dueDate = new Date(year, month - 1, day);
        dueDate.setHours(0, 0, 0, 0);
        const diffTime = dueDate - today;
        return Math.round(diffTime / (1000 * 60 * 60 * 24));
    };

    const formatCurrency = (val) => {
        if (!val && val !== 0) return 'R$ 0,00';
        const num = parseFloat(val);
        if (isNaN(num)) return 'R$ 0,00';
        return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '--/--/----';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    const formatMonthYearLabel = (monthKey) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(year, parseInt(month) - 1, 1);
        return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    };

    const addOneMonth = (dateStr) => {
        if (!dateStr) return dateStr;
        const [year, month, day] = dateStr.split('-').map(Number);
        const d = new Date(year, month - 1, day);
        const targetMonth = d.getMonth() + 1;
        d.setMonth(targetMonth);
        if (d.getMonth() !== targetMonth % 12) { d.setDate(0); }
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    const getDueDateBadge = (dueDateStr, status) => {
        if (status === 'pago') { return { label: 'PAGO', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 }; }
        const diffDays = getDaysDifference(dueDateStr);
        if (diffDays < 0) { return { label: `Vencido há ${Math.abs(diffDays)}d`, badgeClass: 'bg-red-50 text-red-700 border-red-200 font-semibold', icon: AlertTriangle }; }
        if (diffDays === 0) { return { label: 'Vence Hoje!', badgeClass: 'bg-red-100 text-red-800 border-red-300 font-bold animate-pulse', icon: AlertCircle }; }
        if (diffDays === 1) { return { label: 'Vence Amanhã', badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 font-medium', icon: Clock }; }
        if (diffDays <= 3) { return { label: `Vence em ${diffDays}d`, badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 font-medium', icon: Clock }; }
        if (diffDays <= 7) { return { label: `Vence em ${diffDays}d`, badgeClass: 'bg-purple-50 text-purple-700 border-purple-200', icon: Calendar }; }
        return { label: `Vence em ${diffDays}d`, badgeClass: 'bg-slate-50 text-slate-700 border-slate-200', icon: Calendar };
    };

    const getServiceColor = (service) => {
        const s = service?.toLowerCase() || '';
        if (s.includes('unitv')) return 'bg-blue-50 text-blue-700 border-blue-200';
        if (s.includes('alphaplay')) return 'bg-purple-50 text-purple-700 border-purple-200';
        if (s.includes('assist')) return 'bg-pink-50 text-pink-700 border-pink-200';
        if (s.includes('blade')) return 'bg-red-50 text-red-700 border-red-200';
        return 'bg-slate-100 text-slate-700 border-slate-200';
    };

    // --- EFEITOS DE AUTOMAÇÃO E GRAVAÇÃO ---

    // 1. Gravar dados offline automaticamente
    useEffect(() => {
        localStorage.setItem('gerenciador_pro_clients', JSON.stringify(clients));
    }, [clients]);

    useEffect(() => {
        localStorage.setItem('gerenciador_pro_revenue', JSON.stringify(monthlyRevenue));
    }, [monthlyRevenue]);

    useEffect(() => {
        localStorage.setItem('gerenciador_pro_pix', pixKey);
        localStorage.setItem('gerenciador_pro_time', notificationTime);
    }, [pixKey, notificationTime]);

    // 2. Regra automática: Volta a PENDENTE 10 dias antes de vencer
    useEffect(() => {
        if (!clients || clients.length === 0) return;

        let needsUpdate = false;
        const updatedClients = clients.map(client => {
            if (client.status === 'pago') {
                const diffDays = getDaysDifference(client.dueDate);
                if (diffDays <= 10) {
                    needsUpdate = true;
                    return { ...client, status: 'pendente' };
                }
            }
            return client;
        });

        if (needsUpdate) {
            setClients(updatedClients);
        }
    }, [clients]);

    // 3. Notificações do Navegador Diárias
    useEffect(() => {
        if (!clients.length) return;

        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        const checkDailyNotifications = () => {
            const now = new Date();
            const currentHour = now.getHours().toString().padStart(2, '0');
            const currentMinute = now.getMinutes().toString().padStart(2, '0');
            const currentTime = `${currentHour}:${currentMinute}`;
            
            const todayStr = now.toISOString().slice(0, 10);
            const lastNotified = localStorage.getItem('lastNotifiedDate_pro');

            if (currentTime === notificationTime && lastNotified !== todayStr) {
                const expiringToday = clients.filter(client => {
                    if (client.status === 'pago') return false;
                    const diffDays = getDaysDifference(client.dueDate);
                    return diffDays <= 0; 
                });

                if (expiringToday.length > 0) {
                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification("Lembrete Gerenciador PRO 🔔", {
                            body: `Você tem ${expiringToday.length} cliente(s) com vencimento hoje ou pendente.`,
                            icon: '/favicon.ico',
                        });
                        localStorage.setItem('lastNotifiedDate_pro', todayStr);
                    }
                } else {
                    localStorage.setItem('lastNotifiedDate_pro', todayStr);
                }
            }
        };

        const interval = setInterval(checkDailyNotifications, 60000);
        return () => clearInterval(interval);
    }, [clients, notificationTime]);

    // --- Derived Statistics ---
    const stats = useMemo(() => {
        const totalClients = clients.length;
        let totalRevenue = 0, pendingAmount = 0, paidAmount = 0, urgentCount = 0;

        clients.forEach(c => {
            const val = parseFloat(c.amount) || 0;
            totalRevenue += val;
            if (c.status === 'pago') {
                paidAmount += val;
            } else {
                pendingAmount += val;
                if (getDaysDifference(c.dueDate) <= 0) urgentCount++;
            }
        });

        return { totalClients, totalRevenue, pendingAmount, paidAmount, urgentCount };
    }, [clients]);

    // --- FILTRAGEM E ORDENAÇÃO AUTOMÁTICA POR DATA DE VENCIMENTO ---
    const filteredClients = useMemo(() => {
        // Filtra por busca e status
        const filtered = clients.filter(client => {
            const nameMatch = client.name?.toLowerCase().includes(searchQuery.toLowerCase());
            const phoneMatch = client.phone?.includes(searchQuery);
            const serviceMatch = client.service?.toLowerCase().includes(searchQuery.toLowerCase());
            if (!(nameMatch || phoneMatch || serviceMatch)) return false;

            if (filterStatus === 'pending') return client.status !== 'pago';
            if (filterStatus === 'paid') return client.status === 'pago';
            if (filterStatus === 'urgent') return client.status !== 'pago' && getDaysDifference(client.dueDate) <= 0;
            return true;
        });

        // Ordena por data de vencimento (do mais antigo/vencido para o mais futuro)
        return filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    }, [clients, searchQuery, filterStatus]);

    // --- Ações Locais ---
    const handleSaveClient = (e) => {
        e.preventDefault();
        const clientData = {
            id: editingClient ? editingClient.id : Date.now().toString(),
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            amount: parseFloat(formData.amount) || 0,
            dueDate: formData.dueDate,
            service: formData.service || '',
            notes: formData.notes || '',
            status: editingClient ? editingClient.status : 'pendente',
        };

        if (editingClient) {
            setClients(clients.map(c => c.id === editingClient.id ? clientData : c));
            showToast("Cliente atualizado com sucesso!");
        } else {
            setClients([...clients, clientData]);
            showToast("Cliente registrado e salvo!");
        }
        setIsClientModalOpen(false);
        setEditingClient(null);
        setFormData({ name: '', phone: '', amount: '', dueDate: '', service: '', notes: '' });
    };

    const handleDeleteClient = (client) => {
        setConfirmModal({
            title: "Excluir Cliente",
            message: `Tem certeza que deseja apagar ${client.name}?`,
            confirmText: "Excluir",
            isDanger: true,
            onConfirm: () => {
                setClients(clients.filter(c => c.id !== client.id));
                showToast("Cliente apagado com sucesso.");
                setConfirmModal(null);
            }
        });
    };

    const handleToggleStatus = (client) => {
        if (client.status === 'pago') {
            setClients(clients.map(c => c.id === client.id ? { ...c, status: 'pendente' } : c));
            showToast(`Status alterado para PENDENTE.`);
        } else {
            const nextDueDate = addOneMonth(client.dueDate);
            setClients(clients.map(c => c.id === client.id ? { ...c, status: 'pago', dueDate: nextDueDate } : c));
            
            const date = new Date();
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            setMonthlyRevenue(prev => {
                const existingMonth = prev.find(m => m.monthKey === monthKey);
                if (existingMonth) {
                    return prev.map(m => m.monthKey === monthKey ? { ...m, total: m.total + parseFloat(client.amount) } : m);
                } else {
                    return [{ monthKey, total: parseFloat(client.amount) }, ...prev].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
                }
            });

            showToast(`Pagamento confirmado! Vencimento renovado.`);
        }
    };

    const handleSaveSettings = (e) => {
        e.preventDefault();
        showToast("Configurações salvas no celular!");
    };

    const copyToClipboard = (text) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedPix(true);
        showToast("Chave PIX copiada!");
        setTimeout(() => setCopiedPix(false), 2500);
    };

    const generateWhatsAppLink = (client, type) => {
        const cleanPhone = client.phone.replace(/\D/g, '');
        if (!cleanPhone) {
            showToast("Número inválido.", "error");
            return "#";
        }

        const diffDays = getDaysDifference(client.dueDate);
        const formattedDate = formatDate(client.dueDate);
        const formattedVal = formatCurrency(client.amount);
        const pixMsg = pixKey ? `\n🔑 *Chave PIX:* ${pixKey}` : '';
        const servicoText = client.service ? ` do *${client.service}*` : '';

        let text = '';

        if (type === 'reminder') {
            let timeText = '';
            if (diffDays > 1) { timeText = `vence em *${diffDays} dias* (${formattedDate})`; } 
            else if (diffDays === 1) { timeText = `vence *AMANHÃ* (${formattedDate})`; } 
            else if (diffDays === 0) { timeText = `vence *HOJE* (${formattedDate})`; } 
            else { timeText = `venceu no dia *${formattedDate}*`; }

            text = `Olá, *${client.name}*! 👋\n\nPassando para lembrar que o pagamento da sua assinatura${servicoText} ${timeText}.\n\n💰 *Valor:* ${formattedVal}${pixMsg}\n\nAssim que realizar a transferência, me envie o comprovante por aqui para atualizarmos o seu cadastro! ✅\n\nMuito obrigado!`;
        } else if (type === 'today') {
            if (diffDays < 0) {
                text = `Olá, *${client.name}*! ⚠️\n\nNotamos que o vencimento do seu plano${servicoText} foi em *${formattedDate}* (${Math.abs(diffDays)} dias atrasado) e sua assinatura encontra-se pendente.\n\n💰 *Valor:* ${formattedVal}${pixMsg}\n\nPodemos confirmar a renovação para manter seu serviço ativo sem interrupções? Caso precise de suporte, estou à disposição! 🚀`;
            } else {
                text = `Olá, *${client.name}*! 🔴\n\nSeu plano${servicoText} *vence HOJE* (${formattedDate}).\n\n💰 *Valor:* ${formattedVal}${pixMsg}\n\nPor gentileza, envie o comprovante assim que efetuar o pagamento. 🚀`;
            }
        }
        return `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(text)}`;
    };

    const handleExport = () => {
        const dataStr = JSON.stringify({ 
            version: '1.2-offline',
            exportedAt: new Date().toISOString(),
            pixKey, 
            notificationTime,
            clients,
            monthlyRevenue
        }, null, 2);
        
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `backup_gerenciador_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Backup exportado com sucesso!");
    };

    const handleImport = (e) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const reader = new FileReader();

        setConfirmModal({
            title: "Importar Backup",
            message: "Atenção: Os dados atuais serão substituídos pelos dados do arquivo. Deseja continuar?",
            confirmText: "Importar Dados",
            isDanger: true,
            onConfirm: () => {
                reader.onload = (event) => {
                    try {
                        const parsed = JSON.parse(event.target.result);
                        if (parsed.clients) setClients(parsed.clients);
                        if (parsed.monthlyRevenue) setMonthlyRevenue(parsed.monthlyRevenue);
                        if (parsed.pixKey !== undefined) setPixKey(parsed.pixKey);
                        if (parsed.notificationTime) setNotificationTime(parsed.notificationTime);
                        
                        showToast(`Dados importados com sucesso!`);
                    } catch (error) {
                        showToast("Erro ao ler o arquivo JSON.", "error");
                    }
                };
                reader.readAsText(file);
                setConfirmModal(null);
            }
        });
        e.target.value = ''; 
    };

    const handleClearReports = () => {
        setConfirmModal({
            title: "Limpar Histórico",
            message: "Tem certeza que deseja apagar todo o histórico de faturamento? Esta ação não afetará os seus clientes atuais, apenas o histórico de pagamentos passados.",
            confirmText: "Apagar Tudo",
            isDanger: true,
            onConfirm: () => {
                setMonthlyRevenue([]);
                showToast("Histórico de faturamento apagado.");
                setConfirmModal(null);
            }
        });
    };

    // --- Render Views ---
    const renderClientsTab = () => (
        <div className="pb-28 pt-4 px-4 max-w-4xl mx-auto space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Clientes</span>
                    <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-2xl font-black text-slate-800">{stats.totalClients}</span>
                        <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><User size={16} /></div>
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Previsto Mês</span>
                    <div className="mt-2 flex flex-col">
                        <span className="text-lg font-bold text-slate-800 leading-tight truncate">{formatCurrency(stats.totalRevenue)}</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Total mensal</span>
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">A Receber</span>
                    <div className="mt-2 flex flex-col">
                        <span className="text-lg font-bold text-amber-600 leading-tight truncate">{formatCurrency(stats.pendingAmount)}</span>
                        <span className="text-[10px] text-amber-700/70 font-medium mt-0.5">Pendentes</span>
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recebido</span>
                    <div className="mt-2 flex flex-col">
                        <span className="text-lg font-bold text-emerald-600 leading-tight truncate">{formatCurrency(stats.paidAmount)}</span>
                        <span className="text-[10px] text-emerald-700/70 font-medium mt-0.5">Quitados</span>
                    </div>
                </div>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Procurar..." className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none transition-all" />
                    {searchQuery && (<button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={16} /></button>)}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                    <button onClick={() => setFilterStatus('all')} className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap ${filterStatus === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>Todos</button>
                    <button onClick={() => setFilterStatus('pending')} className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap ${filterStatus === 'pending' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700'}`}>Pendentes</button>
                    <button onClick={() => setFilterStatus('urgent')} className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap ${filterStatus === 'urgent' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700'}`}>⚠️ Hoje / Vencidos</button>
                    <button onClick={() => setFilterStatus('paid')} className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap ${filterStatus === 'paid' ? 'bg-[#25D366] text-white' : 'bg-emerald-50 text-emerald-700'}`}>Pagos</button>
                </div>
            </div>

            <div className="space-y-3">
                {filteredClients.length === 0 && (
                    <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center shadow-sm">
                        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3"><Database size={28} /></div>
                        <h3 className="font-semibold text-slate-700">Sem clientes registrados</h3>
                        <p className="text-slate-400 text-xs mt-1">Toque no botão + abaixo para começar.</p>
                    </div>
                )}
                {filteredClients.map((client) => {
                    const dueDateBadge = getDueDateBadge(client.dueDate, client.status);
                    const BadgeIcon = dueDateBadge.icon;

                    return (
                        <div key={client.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm relative group">
                            <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="flex-1 pr-2">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <h3 className="font-bold text-slate-800 text-base leading-snug">{client.name}</h3>
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] border ${dueDateBadge.badgeClass}`}><BadgeIcon size={12} />{dueDateBadge.label}</span>
                                    </div>
                                    <div className="flex items-center text-slate-500 text-xs gap-3 flex-wrap">
                                        <span className="flex items-center gap-1 font-medium"><Smartphone size={13} className="text-slate-400" />{client.phone}</span>
                                        {client.service && (<span className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${getServiceColor(client.service)}`}><Tv size={10} />{client.service}</span>)}
                                    </div>
                                </div>
                                <button onClick={() => handleToggleStatus(client)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 ${client.status === 'pago' ? 'bg-[#25D366] text-white' : 'bg-amber-500 text-white'}`}>
                                    {client.status === 'pago' ? <><CheckCircle2 size={13} />PAGO</> : <><Clock size={13} />PENDENTE</>}
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-xl mb-3 border border-slate-100">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Vencimento</span>
                                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1 mt-0.5"><Calendar size={13} className="text-slate-400" />{formatDate(client.dueDate)}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Valor</span>
                                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5"><DollarSign size={13} className="text-emerald-600" />{formatCurrency(client.amount)}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <a href={generateWhatsAppLink(client, 'reminder')} target="_blank" rel="noopener noreferrer" className="bg-[#25D366] text-white py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"><MessageCircle size={15} />Aviso Prévio</a>
                                    <a href={generateWhatsAppLink(client, 'today')} target="_blank" rel="noopener noreferrer" className="bg-red-500 text-white py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs"><AlertCircle size={15} />Aviso Final</a>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                                    <span className="text-[11px] text-slate-400">Toque no botão de status para atualizar</span>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => { setEditingClient(client); setFormData({...client}); setIsClientModalOpen(true); }} className="px-2.5 py-1 text-slate-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg flex items-center gap-1 font-medium"><Edit2 size={13} />Editar</button>
                                        <button onClick={() => handleDeleteClient(client)} className="px-2.5 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg flex items-center gap-1 font-medium"><Trash2 size={13} />Excluir</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <button onClick={() => { setEditingClient(null); setFormData({ name: '', phone: '', amount: '', dueDate: '', service: '', notes: '' }); setIsClientModalOpen(true); }} className="fixed bottom-20 right-5 sm:right-8 w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-lg hover:bg-[#20bd5a] hover:scale-105 transition-all z-30 group"><UserPlus size={24} className="group-hover:rotate-12 transition-transform" /></button>
        </div>
    );

    const renderReportsTab = () => (
        <div className="p-4 max-w-xl mx-auto space-y-4 pb-28">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-1">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <TrendingUp className="text-[#25D366]" size={20} />
                        Faturamento Mensal
                    </h2>
                    {monthlyRevenue.length > 0 && (
                        <button 
                            onClick={handleClearReports}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Limpar Histórico"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>

                <p className="text-xs text-slate-500 mb-5">Acompanhe os recebimentos (dados guardados offline).</p>
                <div className="space-y-3">
                    {monthlyRevenue.length === 0 && (
                        <div className="text-center py-6"><span className="text-slate-400 text-sm">Ainda sem registros de pagamento.</span></div>
                    )}
                    {monthlyRevenue.map((item) => (
                        <div key={item.monthKey} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center text-[#25D366]"><Calendar size={18} /></div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800 capitalize">{formatMonthYearLabel(item.monthKey)}</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mt-0.5">Total Arrecadado</p>
                                </div>
                            </div>
                            <div className="text-right"><p className="text-lg font-black text-emerald-600 tracking-tight">{formatCurrency(item.total)}</p></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderSettingsTab = () => (
        <div className="p-4 max-w-xl mx-auto space-y-4 pb-28">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2"><Settings className="text-[#25D366]" size={20} />Configurações</h2>
                <form onSubmit={handleSaveSettings} className="space-y-5 mt-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">A sua Chave PIX</label>
                        <input type="text" value={pixKey} onChange={(e) => setPixKey(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none" placeholder="Ex: e-mail ou celular..." />
                    </div>
                    <button type="submit" className="w-full bg-[#25D366] text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2"><Check size={18} />Gravar Ajustes</button>
                </form>
            </div>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3 text-xs text-blue-800">
                <ShieldCheck size={20} className="text-blue-500 shrink-0 mt-0.5" />
                <div><span className="font-bold block text-blue-900 mb-0.5">Memória Offline Ativa</span>Os seus dados estão a ser gravados diretamente na memória local deste navegador. Para evitar perda de dados se limpar o histórico, utilize a aba Backup regularmente.</div>
            </div>
        </div>
    );

    const renderBackupTab = () => (
        <div className="p-4 max-w-xl mx-auto space-y-4 pb-28">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                <div><h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2"><Database className="text-[#25D366]" size={20} />Cópia de Segurança</h2></div>
                
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex items-center gap-2"><FileDown size={18} className="text-blue-500" /><h3 className="font-bold text-sm">Exportar Dados</h3></div>
                    <p className="text-xs text-slate-500">Faz download de um arquivo JSON para guardar os dados atuais no seu celular.</p>
                    <button onClick={handleExport} className="w-full bg-white border border-blue-500 text-blue-600 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs"><Download size={16} />Fazer Backup</button>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex items-center gap-2"><FileUp size={18} className="text-orange-500" /><h3 className="font-bold text-sm">Restaurar Dados</h3></div>
                    <p className="text-xs text-slate-500">Substitui os dados locais pelo arquivo de backup selecionado.</p>
                    <label className="w-full bg-white border border-orange-500 text-orange-600 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs">
                        <Upload size={16} />Selecionar Arquivo JSON
                        <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                    </label>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50/80 font-sans text-slate-800 antialiased">
            <header className="bg-slate-900 text-white pt-6 pb-5 px-5 shadow-sm sticky top-0 z-20 border-b border-slate-800">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2"><span className="p-1.5 bg-[#25D366] text-slate-950 rounded-xl font-black text-xs">PRO</span><h1 className="text-xl font-black tracking-tight text-white">Gerenciador</h1></div>
                        <p className="text-slate-400 text-xs mt-0.5">Gestão de Clientes Offline</p>
                    </div>
                </div>
            </header>

            <main className="min-h-[calc(100vh-140px)]">
                {activeTab === 'clients' && renderClientsTab()}
                {activeTab === 'reports' && renderReportsTab()}
                {activeTab === 'settings' && renderSettingsTab()}
                {activeTab === 'backup' && renderBackupTab()}
            </main>

            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around pb-safe z-30 shadow-lg">
                <div className="max-w-md w-full flex justify-around mx-auto">
                    <button onClick={() => setActiveTab('clients')} className={`flex-1 py-3 flex flex-col items-center justify-center ${activeTab === 'clients' ? 'text-[#25D366] font-bold' : 'text-slate-400'}`}><User size={20} /><span className="text-[10px] mt-1 tracking-wider uppercase">Clientes</span></button>
                    <button onClick={() => setActiveTab('reports')} className={`flex-1 py-3 flex flex-col items-center justify-center ${activeTab === 'reports' ? 'text-[#25D366] font-bold' : 'text-slate-400'}`}><TrendingUp size={20} /><span className="text-[10px] mt-1 tracking-wider uppercase">Relatórios</span></button>
                    <button onClick={() => setActiveTab('settings')} className={`flex-1 py-3 flex flex-col items-center justify-center ${activeTab === 'settings' ? 'text-[#25D366] font-bold' : 'text-slate-400'}`}><Settings size={20} /><span className="text-[10px] mt-1 tracking-wider uppercase">Ajustes</span></button>
                    <button onClick={() => setActiveTab('backup')} className={`flex-1 py-3 flex flex-col items-center justify-center ${activeTab === 'backup' ? 'text-[#25D366] font-bold' : 'text-slate-400'}`}><Database size={20} /><span className="text-[10px] mt-1 tracking-wider uppercase">Backup</span></button>
                </div>
            </nav>

            {isClientModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-5">
                        <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Cliente</h2><button onClick={() => setIsClientModalOpen(false)}><X size={20} /></button></div>
                        <form onSubmit={handleSaveClient} className="space-y-4">
                            <div><label className="block text-xs font-bold mb-1">Nome *</label><input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl" placeholder="Nome do cliente" /></div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold mb-1">WhatsApp *</label><input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl" placeholder="Ex: 11999998888" /></div>
                                
                                <div>
                                    <label className="block text-xs font-bold mb-1">Serviço</label>
                                    <input 
                                        type="text" 
                                        value={formData.service} 
                                        onChange={e => setFormData({...formData, service: e.target.value})} 
                                        className="w-full p-3 bg-slate-50 border rounded-xl" 
                                        placeholder="Ex: UniTV, Netflix..." 
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-xs font-bold mb-1">Valor (R$)</label><input required type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl" placeholder="35.00" /></div>
                                <div><label className="block text-xs font-bold mb-1">Vencimento *</label><input required type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl" /></div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1">Anotações Adicionais</label>
                                <input type="text" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full p-3 bg-slate-50 border rounded-xl" placeholder="Ex: Plano Anual..." />
                            </div>
                            <button type="submit" className="w-full bg-[#25D366] text-white py-3.5 rounded-xl font-bold">Gravar Cliente</button>
                        </form>
                    </div>
                </div>
            )}

            {confirmModal && (
                <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full"><h3 className="font-bold mb-2">{confirmModal.title}</h3><p className="text-xs mb-6">{confirmModal.message}</p>
                        <div className="flex justify-end gap-2 text-xs">
                            <button onClick={() => setConfirmModal(null)} className="px-4 py-2.5 rounded-xl bg-slate-100">Cancelar colar</button>
                            <button onClick={confirmModal.onConfirm} className={`px-4 py-2.5 rounded-xl text-white ${confirmModal.isDanger ? 'bg-red-500' : 'bg-[#25D366]'}`}>{confirmModal.confirmText}</button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-2xl bg-slate-900 text-white shadow-xl text-xs flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[#25D366]" /><span>{toast.message}</span>
                </div>
            )}
        </div>
    );
}
