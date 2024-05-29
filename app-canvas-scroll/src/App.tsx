import React from 'react';
import './App.css';

import { DraggableCanvas1 } from './components/DraggableCanvas1';
import { DraggableCanvas } from './components/DraggableCanvas';

//import { useRef } from 'react';
//import { MemoCanvas } from './components/MemoCanvas';
//import { useStrokeCanvas } from './components/useStrokeCanvas';

//import { DragSample } from './components/DragSample';

function App() {
  return (
    <>
      <DraggableCanvas />
    </>
  );
//  const canvasRef = useRef<HTMLCanvasElement>(null);
//
//  const {
//    drawStart,
//    drawMove,
//    drawEnd,
//    undo,
//    redo,
//    clearUserOperation,
//    clearCanvas
//  } = useStrokeCanvas(canvasRef);
//
//  const onClickClearButton = () => {
//    // canvas 内の描画を削除
//    clearCanvas();
//    // ストロークの座標情報を削除
//    clearUserOperation();
//  };
//
//  return (
//    <div>
//      <MemoCanvas
//          ref={canvasRef}
//          drawStart={drawStart}
//          drawMove={drawMove}
//          endDrawing={drawEnd}
//      />
//      <button type="button" onClick={undo}>
//        undo
//      </button>
//      <button type="button" onClick={redo}>
//        redo
//      </button>
//      <button type="button" onClick={onClickClearButton}>
//        clear
//      </button>
//    </div>
//  );
}

export default App;
