// [HTML の canvas 要素で手書きメモの undo / redo を再現する（React x TypeScript） #React - Qiita](https://qiita.com/moenar014/items/cdc4c758017b1f8f4da1)

import { RefObject, useState, useEffect, useCallback } from "react";

type CurrentStrokeType = { x: number; y: number }[] | [];

type CoordinatesArrayType = {
  coordinates: CurrentStrokeType;
}[];

type AllStrokesType = {
  strokes: CoordinatesArrayType | [];
};

export const useStrokeCanvas = (canvasRef: RefObject<HTMLCanvasElement>) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [allStrokes, setAllStrokes] = useState<AllStrokesType>({
    strokes: []
  });
  const [currentStroke, setCurrentStroke] = useState<CurrentStrokeType>([]);
  const [undoStrokes, setUndoStrokes] = useState<AllStrokesType>({
    strokes: []
  });

  const clearCanvas = useCallback(() => {
    if (!canvasRef.current) return;
    const ctx = (canvasRef.current as HTMLCanvasElement).getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [canvasRef]);

  useEffect(() => {
    clearCanvas();
  }, [clearCanvas]);

  // 描画に必要なcontextを取得し、線の色、幅をセットする
  const getContext = useCallback(() => {
    return (canvasRef.current as HTMLCanvasElement).getContext("2d");
  }, [canvasRef]);

  useEffect(() => {
    const ctx = getContext();
    if (!ctx) return;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#333";
  }, [getContext]);

  // offset(canvas左上からの)を返す。Touch,Mouseイベント両対応
  const offsetPosition = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.nativeEvent instanceof TouchEvent) {
      const rect = (e.target as any).getBoundingClientRect();
      const offsetX =
        e.nativeEvent.touches[0].clientX - window.pageXOffset - rect.left;
      const offsetY =
        e.nativeEvent.touches[0].clientY - window.pageYOffset - rect.top;
      return { offsetX, offsetY };
    }

    // Mouse Event
    return { offsetX: e.nativeEvent.offsetX, offsetY: e.nativeEvent.offsetY };
  };

  type MouseOrTouchEventHandler<T = Element> = React.EventHandler<
    React.MouseEvent<T> | React.TouchEvent<T>
  >;

  const draw = () => {
    const ctx = getContext();
    if (!ctx || !canvasRef.current) return;

    // 直近の操作のパスを描く
    ctx.beginPath();
    if (currentStroke !== null) {
      for (let i = 0; i < currentStroke.length; i += 1) {
        const xy = currentStroke[i];
        if (i === 0) {
          ctx.moveTo(xy.x, xy.y);
        } else {
          ctx.lineTo(xy.x, xy.y);
        }
      }
    }
    ctx.stroke();
  };

  // 描画開始
  const drawStart: MouseOrTouchEventHandler = (e) => {
    const { offsetX: x, offsetY: y } = offsetPosition(e);
    // 現在のストローク情報として座標を保存していく
    setCurrentStroke([{ x, y }]);
    setIsDrawing(true);
  };

  // 描画中
  const drawMove: MouseOrTouchEventHandler = (e) => {
    if (!isDrawing) return;
    const { offsetX: x, offsetY: y } = offsetPosition(e);
    // カーソルを動かして1ストロークを書き続ける間、現在のストローク情報として座標を保存し続ける
    setCurrentStroke([...currentStroke, { x, y }]);
    draw();
  };

  // 描画完了
  const drawEnd: MouseOrTouchEventHandler = () => {
    setIsDrawing(false);

    // 1ストロークの描画が終わった時点で、現在のストローク情報をすべてのストローク情報の最新として保存
    const nowAllStrokes = allStrokes.strokes;
    setAllStrokes({
      strokes: [...nowAllStrokes, { coordinates: currentStroke }]
    });

    // 現在のストローク情報をクリア
    setCurrentStroke([]);
  };

  const undo = () => {
    const ctx = getContext();
    if (!ctx || !canvasRef.current) return;
    // 一度描画をすべてクリア
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // redo 用に最新のストロークを保存しておく
    const lastStroke = allStrokes.strokes.slice(-1)[0];
    const nowUndoStrokes = undoStrokes.strokes;
    setUndoStrokes({
      strokes: [...nowUndoStrokes, lastStroke]
    });

    // すべてのストローク情報から最後の配列を取り除く
    const newAllStrokes: AllStrokesType = {
      strokes: allStrokes.strokes.slice(0, -1)
    };

    // 最新のすべてのストローク情報を canvas に描画させる
    ctx.beginPath();
    for (let i = 0; i < newAllStrokes.strokes.length; i += 1) {
      const operation = newAllStrokes.strokes[i];
      for (let j = 0; j < operation.coordinates.length; j += 1) {
        const xy = operation.coordinates[j];
        if (j === 0) {
          ctx.moveTo(xy.x, xy.y);
        } else {
          ctx.lineTo(xy.x, xy.y);
        }
      }
    }
    ctx.stroke();

    // 最新のすべてのストローク情報を保存
    setAllStrokes({ strokes: [...newAllStrokes.strokes] });
  };

  const redo = () => {
    const ctx = getContext();
    if (!ctx || !canvasRef.current) return;

    // undo したストローク情報から最新のストロークを復元（描画）させる
    const lastUndoOperation = undoStrokes.strokes.slice(-1)[0];
    ctx.beginPath();
    if (lastUndoOperation && lastUndoOperation.coordinates.length > 0) {
      for (let i = 0; i < lastUndoOperation.coordinates.length; i += 1) {
        const xy = lastUndoOperation.coordinates[i];
        if (i === 0) {
          ctx.moveTo(xy.x, xy.y);
        } else {
          ctx.lineTo(xy.x, xy.y);
        }
      }
    }
    ctx.stroke();

    // undoStrokes の一番後ろのストロークを削除する
    const newUndoStrokes = undoStrokes.strokes.slice(0, -1);
    setUndoStrokes({ strokes: [...newUndoStrokes] });

    // redo したストロークをすべてのストローク情報に戻す
    setAllStrokes({
      strokes: [...allStrokes.strokes, lastUndoOperation]
    });
  };

  const clearUserOperation = () => {
    setAllStrokes({ strokes: [] });
    setCurrentStroke([]);
    setUndoStrokes({ strokes: [] });
  };

  return {
    drawStart,
    drawMove,
    drawEnd,
    undo,
    redo,
    clearUserOperation,
    clearCanvas,
    userOperations: allStrokes
  };
};
