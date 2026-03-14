// Global State
let healthRecords = [];
let chart = null;
let currentPatientId = localStorage.getItem('patientId') || 'avo-maria';

// Load custom settings or use defaults
let settings = JSON.parse(localStorage.getItem('granny_settings')) || {
    highThreshold: { sys: 14, dia: 9 },
    lowThreshold: { sys: 9, dia: 5 }
};

// Initialize Lucide Icons
lucide.createIcons();

/**
 * Load records from Firestore
 */
async function loadRecordsFromFirestore() {
    try {
        const q = query(collection(window.db, 'patients', currentPatientId, 'records'), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        healthRecords = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            healthRecords.push({
                id: doc.id,
                ...data,
                timestamp: new Date(data.timestamp.seconds * 1000).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
            });
        });
    } catch (error) {
        console.error('Erro ao carregar registros:', error);
        // Fallback to localStorage if Firestore fails
        healthRecords = JSON.parse(localStorage.getItem('granny_pro_v1')) || [];
    }
}

/**
 * Records new pressure data
 */
function recordData() {
    const input = document.getElementById('pressureInput');
    const value = input.value.trim();

    if (!value.includes('/')) {
        alert("Use o formato: 12/8");
        return;
    }

    const parts = value.split('/');
    const sys = Number(parts[0]);
    const dia = Number(parts[1]);
    if (isNaN(sys) || isNaN(dia)) {
        alert('Digite valores numéricos válidos separados por /.');
        return;
    }
    const now = new Date();

    const status = classifyPressure(sys, dia);
    const newRecord = {
        id: Date.now(),
        timestamp: now.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
        sys,
        dia,
        status,
        advice: status.advice
    };

    // When a new record is saved, the guidance will appear only in the history entries
    // (no alert or extra feedback element).
    // previously we used alerts/feedback; they've been removed per user request.
    // nothing to do here
    // const feedbackEl = document.getElementById('entryFeedback'); // no longer used
    // if (status.advice) { ... }


    healthRecords.unshift(newRecord);
    // Save to Firestore
    try {
        await addDoc(collection(window.db, 'patients', currentPatientId, 'records'), {
            sys: newRecord.sys,
            dia: newRecord.dia,
            status: newRecord.status,
            advice: newRecord.advice,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Erro ao salvar no Firestore:', error);
        // Fallback to localStorage
        localStorage.setItem('granny_pro_v1', JSON.stringify(healthRecords));
    }
    
    input.value = '';
    updateUI();
}

/**
 * Classification logic (Lógica de Senior: código limpo e reutilizável)
 */
function classifyPressure(sys, dia) {
    // classification based on user-defined thresholds (kept for backwards compatibility)
    let label, className;
    if (sys >= settings.highThreshold.sys || dia >= settings.highThreshold.dia) {
        label = 'ALTA';
        className = 'text-red-600 bg-red-50 border-red-100';
    } else if (sys <= settings.lowThreshold.sys || dia <= settings.lowThreshold.dia) {
        label = 'BAIXA';
        className = 'text-blue-600 bg-blue-50 border-blue-100';
    } else {
        label = 'NORMAL';
        className = 'text-emerald-600 bg-emerald-50 border-emerald-100';
    }

    return { label, class: className, advice: medicalAdvice(sys, dia) };
}

/**
 * Returns a medical guideline message based on the systolic/diastolic values.
 */
function medicalAdvice(sys, dia) {
    // hypertensive crisis
    if (sys > 180 || dia > 120) {
        return 'Crise hipertensiva! Procure socorro médico imediatamente.';
    }
    // stage 2 hypertension
    if (sys >= 140 || dia >= 90) {
        return 'Hipertensão estágio 2 – consulte seu médico o quanto antes.';
    }
    // stage 1 hypertension
    if (sys >= 130 || dia >= 80) {
        return 'Hipertensão estágio 1 – atenção, procure orientação médica.';
    }
    // elevated
    if (sys >= 120 && dia < 80) {
        return 'Pressão elevada, faça controle com hábitos saudáveis.';
    }
    // normal range
    if (sys >= 90 && dia >= 60) {
        return 'Normal/Controlada – continue mantendo bons hábitos.';
    }
    // hypotension
    if (sys < 90 || dia < 60) {
        return 'Pressão baixa (hipotensão) – se houver sintomas, consulte um médico.';
    }
    // fallback
    return '';
}

function updateUI() {
    // make sure every record uses the latest logic (useful after settings change)
    healthRecords = healthRecords.map(r => {
        const status = classifyPressure(r.sys, r.dia);
        return { ...r, status, advice: status.advice };
    });

    renderHistory();
    renderChart();
    loadSettingsToUI();
    lucide.createIcons();

    // no entry feedback element to clear anymore
}

/**
 * Delete a specific record
 */
async function deleteRecord(id) {
    if (!confirm('Tem certeza que deseja apagar este registro?')) return;
    try {
        await deleteDoc(doc(window.db, 'patients', currentPatientId, 'records', id));
        healthRecords = healthRecords.filter(record => record.id !== id);
    } catch (error) {
        console.error('Erro ao deletar do Firestore:', error);
        // Fallback
        healthRecords = healthRecords.filter(record => record.id !== id);
        localStorage.setItem('granny_pro_v1', JSON.stringify(healthRecords));
    }
    updateUI();
}

function renderHistory() {
    const container = document.getElementById('historyLog');
    if (healthRecords.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 py-4">Nenhum registro ainda</p>`;
        return;
    }

    container.innerHTML = healthRecords.map(item => `
        <div class="entry-item ${item.status.class} border">
            <div>
                <p class="text-[10px] font-bold opacity-60">${item.timestamp}</p>
                <p class="text-lg font-mono font-bold">${item.sys}/${item.dia}</p>
                ${item.advice ? `<p class="text-xs opacity-70 mt-1">${item.advice}</p>` : ''}
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] font-black px-2 py-1 rounded border border-current">${item.status.label}</span>
                <button onclick="deleteRecord(${item.id})" class="text-red-500 hover:text-red-700 p-1" title="Apagar registro">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function renderChart() {
    const ctx = document.getElementById('healthChart').getContext('2d');
    const chartData = [...healthRecords].reverse().slice(-7);

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(d => d.timestamp.split(',')[0]),
            datasets: [
                {
                    label: 'Sistólica',
                    data: chartData.map(d => d.sys),
                    borderColor: '#2563eb',
                    tension: 0.4,
                    fill: false
                },
                {
                    label: 'Diastólica',
                    data: chartData.map(d => d.dia),
                    borderColor: '#ef4444',
                    tension: 0.4,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: true, position: 'bottom' } }
        }
    });
}

// hook enter key for faster input
const pressureInput = document.getElementById('pressureInput');
pressureInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') recordData();
});

/**
 * Remove all saved records after confirmation
 */
async function clearHistory() {
    if (!confirm('Tem certeza que deseja limpar todo o histórico?')) return;
    try {
        const querySnapshot = await getDocs(collection(window.db, 'patients', currentPatientId, 'records'));
        querySnapshot.forEach(async (docSnap) => {
            await deleteDoc(doc(window.db, 'patients', currentPatientId, 'records', docSnap.id));
        });
        healthRecords = [];
    } catch (error) {
        console.error('Erro ao limpar do Firestore:', error);
        healthRecords = [];
        localStorage.removeItem('granny_pro_v1');
    }
    updateUI();
}

/**
 * Save custom settings
 */
function saveSettings() {
    const patientIdInput = document.getElementById('patientId').value.trim();
    const highInput = document.getElementById('highThreshold').value.trim();
    const lowInput = document.getElementById('lowThreshold').value.trim();

    if (!patientIdInput) {
        alert('Digite um ID do Paciente/Família.');
        return;
    }

    if (!highInput.includes('/') || !lowInput.includes('/')) {
        alert('Use o formato: 12/8 para os limites.');
        return;
    }

    const [highSys, highDia] = highInput.split('/').map(Number);
    const [lowSys, lowDia] = lowInput.split('/').map(Number);

    if (isNaN(highSys) || isNaN(highDia) || isNaN(lowSys) || isNaN(lowDia)) {
        alert('Digite valores numéricos válidos.');
        return;
    }

    currentPatientId = patientIdInput;
    localStorage.setItem('patientId', currentPatientId);

    settings = {
        highThreshold: { sys: highSys, dia: highDia },
        lowThreshold: { sys: lowSys, dia: lowDia }
    };

    localStorage.setItem('granny_settings', JSON.stringify(settings));
    alert('Configurações salvas! O histórico será reclassificado.');
    loadRecordsFromFirestore().then(() => updateUI());
}

/**
 * Load settings into UI fields
 */
function loadSettingsToUI() {
    document.getElementById('patientId').value = currentPatientId;
    document.getElementById('highThreshold').value = `${settings.highThreshold.sys}/${settings.highThreshold.dia}`;
    document.getElementById('lowThreshold').value = `${settings.lowThreshold.sys}/${settings.lowThreshold.dia}`;
}

// Initial Load
loadRecordsFromFirestore().then(() => updateUI());