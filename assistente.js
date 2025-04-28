const talkButton = document.getElementById('talkButton');
const stopSpeakingButton = document.getElementById('stopSpeakingButton');
const speechBubble = document.getElementById('speech-bubble');

// Imagens
const characterListening = document.getElementById('characterListening');
const characterWaiting = document.getElementById('characterWaiting');
const characterMouthClosed = document.getElementById('characterMouthClosed');
const characterMouthOpen = document.getElementById('characterMouthOpen');

const images = [characterListening, characterWaiting, characterMouthClosed, characterMouthOpen];

let recognitionActive = false;
let speakingInterval = null;
let conversationHistory = []; // Armazena o histórico da conversa
let utterance = null;
let isSpeaking = false; // Flag para controlar se o assistente está falando
let speakingPaused = false; // Flag para verificar se a animação foi pausada

// Reconhecimento de voz
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = 'pt-BR';
recognition.interimResults = false;

// Funções auxiliares
function showOnly(image) {
    images.forEach(img => img.style.display = 'none');
    image.style.display = 'block';
}

function setBocaAberta() {
    showOnly(characterMouthOpen);
}

function setBocaFechada() {
    showOnly(characterMouthClosed);
}

function stopSpeakingSimulation() {
    if (speakingInterval) {
        clearInterval(speakingInterval); // Interrompe a animação de fala
        speakingInterval = null;
    }
    setBocaFechada(); // Fecha a boca ao interromper
    speakingPaused = true; // Marca a animação como pausada
}

function startSpeakingSimulation(text) {
    const palavras = text.split(' ');
    let palavraAtual = 0;

    function falarProximaPalavra() {
        if (palavraAtual >= palavras.length || speakingPaused) {
            stopSpeakingSimulation(); // Interrompe a animação de fala
            return;
        }

        const palavra = palavras[palavraAtual];
        let tempoPalavra = 400 + palavra.length * 30; // Tempo proporcional ao tamanho

        let bocaAberta = false;

        speakingInterval = setInterval(() => {
            if (bocaAberta) {
                setBocaFechada();
            } else {
                setBocaAberta();
            }
            bocaAberta = !bocaAberta;
        }, 100); // A animação da boca ocorre a cada 100ms

        setTimeout(() => {
            clearInterval(speakingInterval); // Interrompe a animação de fala ao fim da palavra
            if (/[bfmpvwy]$/i.test(palavra)) { // Fecha a boca nas letras específicas
                setBocaFechada();
            }
            palavraAtual++;
            falarProximaPalavra();
        }, tempoPalavra);
    }

    falarProximaPalavra();
}

talkButton.addEventListener('click', () => {
    if (recognitionActive || isSpeaking) return; // Impede iniciar a fala se já estiver ativa

    showOnly(characterListening);
    speechBubble.innerText = "Estou ouvindo...";

    talkButton.classList.add('listening');
    recognition.start();
    recognitionActive = true;
    stopSpeakingButton.style.display = 'none'; // Esconde o botão de "parar de falar" inicialmente
});

stopSpeakingButton.addEventListener('click', () => {
    if (utterance) {
        window.speechSynthesis.cancel(); // Interrompe a fala do assistente
        stopSpeakingSimulation(); // Para a animação de fala
        speechBubble.innerText = "Fala interrompida.";
        stopSpeakingButton.style.display = 'none'; // Esconde o botão de parar
        isSpeaking = false; // Marca que o assistente não está mais falando
    }
});

recognition.addEventListener('result', async (event) => {
    const transcript = event.results[0][0].transcript;
    speechBubble.innerText = `Você disse: "${transcript}"`;

    showOnly(characterWaiting);

    // Adiciona a mensagem do usuário no histórico
    conversationHistory.push({ role: 'user', text: transcript });

    const body = {
        contents: [
            {
                parts: conversationHistory.map(message => ({ text: message.text }))
            }
        ]
    };

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyBVvSVcb5mEGO_PrZMsvwjxa6QXvgM_K4Q`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        const iaResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Não entendi.";

        // Remove qualquer formatação com asteriscos (como **texto**)
        const cleanText = iaResponse.replace(/\*{2}(.*?)\*{2}/g, '$1'); // Remove os asteriscos

        // Adiciona a resposta da IA ao histórico
        conversationHistory.push({ role: 'model', text: cleanText });

        utterance = new SpeechSynthesisUtterance(cleanText); // Usa o texto limpo
        utterance.lang = 'pt-BR';

        utterance.onstart = () => {
            isSpeaking = true; // Marca que o assistente está falando
            startSpeakingSimulation(cleanText); // Inicia a animação de fala
            stopSpeakingButton.style.display = 'inline'; // Mostra o botão de parar
        };

        utterance.onend = () => {
            stopSpeakingSimulation(); // Para a animação e fecha a boca
            speechBubble.innerText = "Clique em 'Falar' e diga algo!";
            stopSpeakingButton.style.display = 'none'; // Esconde o botão de parar
            isSpeaking = false; // Marca que o assistente parou de falar
        };

        window.speechSynthesis.speak(utterance); // Inicia a fala

    } catch (error) {
        console.error("Erro ao perguntar para a IA:", error);
        speechBubble.innerText = "Erro ao conectar com a IA.";
        showOnly(characterMouthClosed);
    }
});

recognition.addEventListener('end', () => {
    recognitionActive = false;
    talkButton.classList.remove('listening');
    showOnly(characterMouthClosed); // Fecha a boca quando o reconhecimento termina
});
