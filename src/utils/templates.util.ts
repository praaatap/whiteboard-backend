export interface Point {
  x: number;
  y: number;
}

export interface DrawElement {
  id: string;
  type: string;
  startPoint: Point;
  endPoint?: Point;
  points?: Point[];
  color: string;
  fillColor: string;
  strokeWidth: number;
  text?: string;
  locked?: boolean; // Prevents dragging for background elements
}

const createId = (i: number) => `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`;

export const generateTemplate = (type: string): DrawElement[] => {
  const elements: DrawElement[] = [];

  switch (type.toLowerCase()) {
    case "kanban":
      const kCols = ["To Do", "In Progress", "Done", "Blocked"];
      kCols.forEach((col, i) => {
        // Header Background (Locked)
        elements.push({ 
          id: createId(i), type: "rectangle", 
          startPoint: { x: 50 + i * 320, y: 50 }, endPoint: { x: 350 + i * 320, y: 120 }, 
          color: "#ffffff", fillColor: "#2d3436", strokeWidth: 0, locked: true 
        });
        // Header Text (Locked)
        elements.push({ 
          id: createId(i + 10), type: "text", 
          startPoint: { x: 70 + i * 320, y: 95 }, 
          color: "#ffffff", fillColor: "transparent", strokeWidth: 3, text: col, locked: true 
        });
        // Column Body (Locked)
        elements.push({ 
          id: createId(i + 20), type: "rectangle", 
          startPoint: { x: 50 + i * 320, y: 130 }, endPoint: { x: 350 + i * 320, y: 800 }, 
          color: "#ffffff20", fillColor: "#ffffff05", strokeWidth: 2, locked: true 
        });
      });
      break;

    case "brainstorm":
      // Title
      elements.push({ 
        id: createId(1), type: "text", 
        startPoint: { x: 100, y: 80 }, 
        color: "#ffffff", fillColor: "transparent", strokeWidth: 5, text: "Brainstorming Session", locked: true 
      });
      // Pre-placed Sticky Notes
      const stickies = ["#ff7675", "#ffeaa7", "#74b9ff", "#55efc4", "#a29bfe"];
      stickies.forEach((color, i) => {
        elements.push({ 
          id: createId(i + 10), type: "sticky", 
          startPoint: { x: 100 + i * 220, y: 150 }, endPoint: { x: 300 + i * 220, y: 350 }, 
          color: "#000000", fillColor: color, strokeWidth: 1, text: "Idea..." 
        });
      });
      break;

    case "wireframe":
      // Browser Frame
      elements.push({ id: createId(1), type: "rectangle", startPoint: { x: 100, y: 100 }, endPoint: { x: 1100, y: 800 }, color: "#ccc", fillColor: "#1e1e1e", strokeWidth: 2, locked: true });
      elements.push({ id: createId(2), type: "rectangle", startPoint: { x: 100, y: 100 }, endPoint: { x: 1100, y: 150 }, color: "#ccc", fillColor: "#333", strokeWidth: 2, locked: true });
      // UI Elements
      elements.push({ id: createId(3), type: "circle", startPoint: { x: 120, y: 125 }, endPoint: { x: 135, y: 125 }, color: "#ff5f57", fillColor: "#ff5f57", strokeWidth: 1, locked: true });
      elements.push({ id: createId(4), type: "circle", startPoint: { x: 150, y: 125 }, endPoint: { x: 165, y: 125 }, color: "#febc2e", fillColor: "#febc2e", strokeWidth: 1, locked: true });
      elements.push({ id: createId(5), type: "text", startPoint: { x: 500, y: 400 }, color: "#555", fillColor: "transparent", strokeWidth: 4, text: "UI Mockup Area", locked: true });
      break;
      
    case "retrospective":
      const rCols = ["What went well?", "What didn't go well?", "Action Items"];
      const rColors = ["#00b894", "#d63031", "#0984e3"];
      rCols.forEach((col, i) => {
        elements.push({ id: createId(i), type: "rectangle", startPoint: { x: 50 + i * 350, y: 100 }, endPoint: { x: 380 + i * 350, y: 160 }, color: rColors[i], fillColor: rColors[i] + "40", strokeWidth: 2, locked: true });
        elements.push({ id: createId(i+10), type: "text", startPoint: { x: 70 + i * 350, y: 140 }, color: "#fff", fillColor: "transparent", strokeWidth: 2, text: col, locked: true });
        elements.push({ id: createId(i+20), type: "rectangle", startPoint: { x: 50 + i * 350, y: 170 }, endPoint: { x: 380 + i * 350, y: 700 }, color: "#ffffff40", fillColor: "transparent", strokeWidth: 1, locked: true });
      });
      break;
  }
  return elements;
};