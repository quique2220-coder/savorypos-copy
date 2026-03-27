const sendMessage = async (text) => {
  if (!text.trim() || !conversationId) return;
  setIsLoading(true);
  
  // Procesamos los datos nosotros mismos (Cero error para la IA)
  const dataContext = {
    analisis_real: marginData.map(r => ({
      nombre: r.name,
      precio: `$${r.sale_price}`,
      margen_porcentual: `${r.margin.toFixed(1)}%`,
      alerta: r.margin < 30 ? "BAJO MARGEN" : "OK"
    }))
  };

  // Le entregamos la respuesta ya masticada
  const promptFinal = `
    INSTRUCCION: No calcules nada. Usa estos datos:
    ${JSON.stringify(dataContext)}
    
    PREGUNTA DEL USUARIO: ${text.trim()}
  `;

  setInput("");
  await base44.agents.addMessage(
    { id: conversationId }, 
    { role: "user", content: promptFinal }
  );
};