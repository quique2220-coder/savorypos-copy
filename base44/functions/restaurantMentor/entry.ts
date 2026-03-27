import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const price = parseFloat(body.price);

    if (!price || price <= 0) {
      return Response.json({ error: "Precio inválido" }, { status: 400 });
    }

    let recommendations = [];

    if (price < 10) {
      recommendations = [
        {
          title: "Estrategia de Volumen",
          description: "Tu precio es bajo. Enfócate en combos (upselling) para aumentar el ticket promedio."
        },
        {
          title: "Anclaje Psicológico",
          description: "Usa precios terminados en .95 o .99 para reforzar la percepción de oferta económica."
        },
        {
          title: "Control de Porciones",
          description: "Con márgenes ajustados, estandariza cada gramo para evitar fugas de utilidad."
        }
      ];
    } else if (price >= 10 && price <= 25) {
      recommendations = [
        {
          title: "Ingeniería de Menú",
          description: "Este es un precio de 'Platillo Estrella'. Colócalo en la esquina superior derecha de tu menú físico."
        },
        {
          title: "Valor Agregado",
          description: "A este nivel, el cliente busca experiencia. Asegura una presentación visual impecable para redes sociales."
        },
        {
          title: "Maridaje Sugerido",
          description: "Entrena a tu staff para ofrecer una bebida específica que complemente este rango de precio."
        }
      ];
    } else {
      recommendations = [
        {
          title: "Premium Experience",
          description: "Precio de alta gama. El servicio debe ser personalizado y el emplatado debe justificar la exclusividad."
        },
        {
          title: "Storytelling",
          description: "Cuenta el origen de los ingredientes. El cliente paga más cuando entiende el valor de la materia prima."
        },
        {
          title: "Escasez Controlada",
          description: "Preséntalo como 'Sugerencia del Chef' o edición limitada para mantener el deseo de exclusividad."
        }
      ];
    }

    return Response.json({ recommendations });

  } catch (error) {
    console.error('Error en restaurantMentor:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});