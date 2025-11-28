interface Point {
  x: number;
  y: number;
}

interface TemplateElement {
  id: string;
  type: string;
  startPoint: Point;
  endPoint?: Point;
  points?: Point[];
  color: string;
  fillColor: string;
  strokeWidth: number;
  text?: string;
}

export function generateTemplate(type: string): TemplateElement[] {
  const baseId = Date.now().toString();
  const createId = (idx: number) => `${baseId}-${idx}`;
  const elements: TemplateElement[] = [];

  switch (type.toLowerCase()) {
    case "kanban":
      const kCols = ["To Do", "In Progress", "Done"];
      kCols.forEach((col, i) => {
        // Header
        elements.push({
          id: createId(i),
          type: "rectangle",
          startPoint: { x: 100 + i * 320, y: 100 },
          endPoint: { x: 400 + i * 320, y: 160 },
          color: "#ffffff",
          fillColor: "#2d3436",
          strokeWidth: 2,
        });
        // Title
        elements.push({
          id: createId(i + 10),
          type: "text",
          startPoint: { x: 120 + i * 320, y: 140 },
          color: "#ffffff",
          fillColor: "transparent",
          strokeWidth: 3,
          text: col,
        });
        // Column
        elements.push({
          id: createId(i + 20),
          type: "rectangle",
          startPoint: { x: 100 + i * 320, y: 170 },
          endPoint: { x: 400 + i * 320, y: 600 },
          color: "#ffffff40",
          fillColor: "transparent",
          strokeWidth: 2,
        });
      });
      break;

    case "brainstorm":
      elements.push({
        id: createId(1),
        type: "text",
        startPoint: { x: 350, y: 80 },
        color: "#ffffff",
        fillColor: "transparent",
        strokeWidth: 4,
        text: "Brainstorming Session",
      });
      const stickies = ["#ff7675", "#ffeaa7", "#74b9ff", "#55efc4"];
      stickies.forEach((color, i) => {
        elements.push({
          id: createId(i + 10),
          type: "sticky",
          startPoint: { x: 100 + i * 180, y: 150 },
          endPoint: { x: 250 + i * 180, y: 300 },
          color: "#ffffff",
          fillColor: color,
          strokeWidth: 1,
          text: "Idea " + (i + 1),
        });
      });
      break;

    case "flowchart":
      // Start
      elements.push({
        id: createId(1),
        type: "circle",
        startPoint: { x: 400, y: 50 },
        endPoint: { x: 550, y: 120 },
        color: "#74b9ff",
        fillColor: "#000",
        strokeWidth: 2,
      });
      elements.push({
        id: createId(2),
        type: "text",
        startPoint: { x: 450, y: 95 },
        color: "#fff",
        fillColor: "transparent",
        strokeWidth: 2,
        text: "Start",
      });
      // Arrow
      elements.push({
        id: createId(3),
        type: "arrow",
        startPoint: { x: 475, y: 120 },
        endPoint: { x: 475, y: 180 },
        color: "#fff",
        fillColor: "transparent",
        strokeWidth: 2,
      });
      // Process
      elements.push({
        id: createId(4),
        type: "rectangle",
        startPoint: { x: 375, y: 180 },
        endPoint: { x: 575, y: 280 },
        color: "#ffeaa7",
        fillColor: "#000",
        strokeWidth: 2,
      });
      elements.push({
        id: createId(5),
        type: "text",
        startPoint: { x: 440, y: 240 },
        color: "#fff",
        fillColor: "transparent",
        strokeWidth: 2,
        text: "Process",
      });
      // Arrow
      elements.push({
        id: createId(6),
        type: "arrow",
        startPoint: { x: 475, y: 280 },
        endPoint: { x: 475, y: 350 },
        color: "#fff",
        fillColor: "transparent",
        strokeWidth: 2,
      });
      // Decision
      elements.push({
        id: createId(7),
        type: "rectangle",
        startPoint: { x: 400, y: 350 },
        endPoint: { x: 550, y: 450 },
        color: "#ff7675",
        fillColor: "#000",
        strokeWidth: 2,
      });
      elements.push({
        id: createId(8),
        type: "text",
        startPoint: { x: 440, y: 410 },
        color: "#fff",
        fillColor: "transparent",
        strokeWidth: 2,
        text: "Decision?",
      });
      break;

    case "mindmap":
      // Center
      elements.push({
        id: createId(1),
        type: "circle",
        startPoint: { x: 400, y: 300 },
        endPoint: { x: 600, y: 450 },
        color: "#a29bfe",
        fillColor: "#a29bfe40",
        strokeWidth: 2,
      });
      elements.push({
        id: createId(2),
        type: "text",
        startPoint: { x: 460, y: 385 },
        color: "#fff",
        fillColor: "transparent",
        strokeWidth: 3,
        text: "Main Idea",
      });
      // Branches
      const positions = [
        { x: 200, y: 150 },
        { x: 800, y: 150 },
        { x: 200, y: 600 },
        { x: 800, y: 600 },
      ];
      positions.forEach((pos, i) => {
        elements.push({
          id: createId(10 + i),
          type: "line",
          startPoint: { x: 500, y: 375 },
          endPoint: { x: pos.x + 75, y: pos.y + 40 },
          color: "#ffffff80",
          fillColor: "transparent",
          strokeWidth: 2,
        });
        elements.push({
          id: createId(20 + i),
          type: "rectangle",
          startPoint: { x: pos.x, y: pos.y },
          endPoint: { x: pos.x + 150, y: pos.y + 80 },
          color: "#74b9ff",
          fillColor: "transparent",
          strokeWidth: 2,
        });
        elements.push({
          id: createId(30 + i),
          type: "text",
          startPoint: { x: pos.x + 20, y: pos.y + 50 },
          color: "#fff",
          fillColor: "transparent",
          strokeWidth: 2,
          text: "Sub Topic",
        });
      });
      break;

    case "wireframe":
      // Browser
      elements.push({
        id: createId(1),
        type: "rectangle",
        startPoint: { x: 100, y: 100 },
        endPoint: { x: 900, y: 600 },
        color: "#fff",
        fillColor: "#1e1e1e",
        strokeWidth: 2,
      });
      elements.push({
        id: createId(2),
        type: "rectangle",
        startPoint: { x: 100, y: 100 },
        endPoint: { x: 900, y: 140 },
        color: "#fff",
        fillColor: "#333",
        strokeWidth: 2,
      });
      // Buttons
      elements.push({
        id: createId(3),
        type: "circle",
        startPoint: { x: 120, y: 110 },
        endPoint: { x: 140, y: 130 },
        color: "#ff5f57",
        fillColor: "#ff5f57",
        strokeWidth: 1,
      });
      elements.push({
        id: createId(4),
        type: "circle",
        startPoint: { x: 150, y: 110 },
        endPoint: { x: 170, y: 130 },
        color: "#febc2e",
        fillColor: "#febc2e",
        strokeWidth: 1,
      });
      // Hero
      elements.push({
        id: createId(5),
        type: "rectangle",
        startPoint: { x: 150, y: 180 },
        endPoint: { x: 850, y: 350 },
        color: "#ffffff40",
        fillColor: "transparent",
        strokeWidth: 1,
      });
      elements.push({
        id: createId(6),
        type: "text",
        startPoint: { x: 450, y: 275 },
        color: "#fff",
        fillColor: "transparent",
        strokeWidth: 2,
        text: "Hero Image",
      });
      break;

    case "retrospective":
      const rCols = ["What went well?", "What didn't go well?", "Action Items"];
      const rColors = ["#00b894", "#d63031", "#0984e3"];
      rCols.forEach((col, i) => {
        elements.push({
          id: createId(i),
          type: "rectangle",
          startPoint: { x: 50 + i * 300, y: 100 },
          endPoint: { x: 330 + i * 300, y: 160 },
          color: rColors[i],
          fillColor: rColors[i] + "40",
          strokeWidth: 2,
        });
        elements.push({
          id: createId(i + 10),
          type: "text",
          startPoint: { x: 70 + i * 300, y: 140 },
          color: "#fff",
          fillColor: "transparent",
          strokeWidth: 2,
          text: col,
        });
        elements.push({
          id: createId(i + 20),
          type: "rectangle",
          startPoint: { x: 50 + i * 300, y: 170 },
          endPoint: { x: 330 + i * 300, y: 600 },
          color: "#ffffff40",
          fillColor: "transparent",
          strokeWidth: 1,
        });
      });
      break;

    case "presentation":
      // Slide Frame
      elements.push({
        id: createId(1),
        type: "rectangle",
        startPoint: { x: 100, y: 100 },
        endPoint: { x: 900, y: 550 },
        color: "#fff",
        fillColor: "#ffffff10",
        strokeWidth: 3,
      });
      elements.push({
        id: createId(2),
        type: "text",
        startPoint: { x: 150, y: 200 },
        color: "#fff",
        fillColor: "transparent",
        strokeWidth: 5,
        text: "Presentation Title",
      });
      elements.push({
        id: createId(3),
        type: "line",
        startPoint: { x: 150, y: 220 },
        endPoint: { x: 850, y: 220 },
        color: "#a29bfe",
        fillColor: "transparent",
        strokeWidth: 4,
      });
      elements.push({
        id: createId(4),
        type: "text",
        startPoint: { x: 150, y: 300 },
        color: "#ccc",
        fillColor: "transparent",
        strokeWidth: 3,
        text: "• Point One",
      });
      elements.push({
        id: createId(5),
        type: "text",
        startPoint: { x: 150, y: 350 },
        color: "#ccc",
        fillColor: "transparent",
        strokeWidth: 3,
        text: "• Point Two",
      });
      elements.push({
        id: createId(6),
        type: "text",
        startPoint: { x: 150, y: 400 },
        color: "#ccc",
        fillColor: "transparent",
        strokeWidth: 3,
        text: "• Point Three",
      });
      break;
  }

  return elements;
}
