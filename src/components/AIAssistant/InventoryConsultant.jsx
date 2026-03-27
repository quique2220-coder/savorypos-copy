// Optimización Estilo C++: Paso de Snapshot de Datos
  const sendMessage = async (text) => {
    if (!text.trim() || !conversationId) return;
    if (stopAudio) stopAudio();
    setIsLoading(true);
    setInput("");

    // Pre-procesamiento: Creamos un mapa ligero del inventario
    const inventorySnapshot = {
      items: inventory.map(i => ({
        n: i.name,
        s: i.current_stock,
        m: i.min_stock || 0,
        status: i.current_stock <= (i.min_stock || 0) ? "CRITICO" : "OK"
      })).filter(i => i.s < i.m * 1.5) // Solo enviamos lo crítico o cercano a acabarse para ahorrar memoria
    };

    const textWithContext = `
      Current date: ${getLocalDate()}
      STOCK_SNAPSHOT: ${JSON.stringify(inventorySnapshot)}
      USER_QUERY: ${text.trim()}
    `;

    await base44.agents.addMessage(
      { id: conversationId }, 
      { role: "user", content: textWithContext }
    );
  };