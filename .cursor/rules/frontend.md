---
description: "Estándares para componentes frontend con diseño limpio, profesional y consistente para una empresa de iluminación."
alwaysApply: true
---

# 🛠️ Tecnologías
- Usa TailwindCSS
- Usa DaisyUI
- Evita React a menos que sea estrictamente necesario
- Usa Astro siempre que no se requiera React
- Evita CSS escrito a mano a menos que sea estrictamente necesario

# 🌗 Modo de color y consistencia visual
- Ignora cualquier estilo oscuro proveniente del navegador, sistema operativo o preferencias del usuario
- No implementes dark mode ni variantes automáticas de tema
- Usa siempre la misma paleta de colores claros definida por el proyecto
- Asegura que los colores no cambien con `prefers-color-scheme`
- Fuerza una experiencia visual consistente independientemente de configuraciones externas

# 🎨 Directrices de color
- Usa una paleta de colores claros como base principal (blancos, grises suaves, tonos luminosos)
- Aplica la regla 60-30-10 para distribución de color:
  - 60% color base claro
  - 30% color secundario neutro
  - 10% color de acento para CTAs y elementos interactivos
- Define roles de color claros:
  - background: claro
  - surface: tarjetas y contenedores
  - text: gris oscuro o negro suave
  - accent: color corporativo o acento
- Mantén alto contraste entre texto y fondo para legibilidad y accesibilidad

# 🪶 Tipografía
- Usa Montserrat para títulos, encabezados y elementos principales
- Usa Inter para texto de interfaz, formularios y contenido general
- Limita el uso a estas dos tipografías
- Define una jerarquía tipográfica clara y consistente (H1–H6, body, labels, buttons)

# 📐 Espaciado y layout
- Usa un sistema de espaciado consistente basado en múltiplos (4px o 8px)
- Prioriza el uso de espacio en blanco para una sensación de orden, limpieza y claridad
- Evita layouts saturados o visualmente ruidosos

# 🧱 Profundidad y jerarquía visual
- Usa sombras suaves y sutiles para crear profundidad y separación de capas
- Aplica elevación ligera en tarjetas, modales y elementos interactivos
- Evita sombras duras, exageradas o efectos visuales innecesarios
- Usa la profundidad para guiar la atención del usuario, no como decoración

# 🧠 Consistencia de componentes
- Mantén estilos coherentes para botones, inputs, tarjetas y enlaces
- Define y respeta estados visuales claros: hover, focus, active y disabled
- Reutiliza componentes siempre que sea posible

# 📱 Accesibilidad y rendimiento
- Asegura legibilidad en todos los tamaños de pantalla
- Usa tamaños de fuente adecuados y buen interlineado
- Evita animaciones pesadas o innecesarias
- Prioriza rendimiento y claridad visual sobre efectos decorativos
