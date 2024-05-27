import { useRef, useEffect, useState } from "react";

type Point = {
    x: number;
    y: number;
};
export interface DraggableCanvasProp {
    scale?: number;
}
export function DraggableCanvas(prop: DraggableCanvasProp){
    // canvasの座標系を座標系A、
    // 描かれる座標系を座標系Bとする

    const refCanvas = useRef<HTMLCanvasElement>(null);
    const refRange = useRef<HTMLInputElement>(null);

    const [isDragging, setIsDragging] = useState<boolean>(false);
    // ドラッグが開始した、座標系Aの座標値
    const [dragStartPoint, setDragStartPoint] = useState<Point|null>(null);
    // 平行移動と拡大縮小のみ。座標系の向きは一緒で、回転はなし。
    // canvas中心点(座標系Aの(w/2, h/2)の位置)にある、座標系Bの座標値
    const [centerPoint, setCenterPoint] = useState<Point>({x:0, y:0});
    // ドラッグが開始したときの、centerPointの値
    const [centerPointBeginningDrag, setCenterPointBeginningDrag] = useState<Point>({x:0, y:0});
    // 座標系Aに対する座標系Bのスケール（Bの方が大きいとき1より大）
    const [scale, setScale] = useState<number>(prop.scale? prop.scale: 1.0);

    // 初期化処理
    useEffect(() => {
        if (!refCanvas) return;
        const canvas = refCanvas.current;
        if (!canvas) return;
        
        canvas.width = 500;
        canvas.height = 400;
    },[]);

    // マウスハンドル
    useEffect(() => {
        if (!refCanvas) return;
        const canvas = refCanvas.current;
        if (!canvas) return;
        const context = canvas.getContext("2d");
        if (!context) return;

        // mouse down
        function handleMouseDown(event: MouseEvent){
            console.log("mouseDown");
            setIsDragging(true);
            setDragStartPoint({x: event.clientX, y: event.clientY});
            setCenterPointBeginningDrag({x: centerPoint.x, y: centerPoint.y});
        }

        // mouse move
        function handleMouseMove(event: MouseEvent){
            if (!context) return;
            if (!isDragging) return;

            //console.log("mouseMove");

            // draw
            draw(event);
        }

        // mouse up
        function handleMouseUp(event: MouseEvent){
            console.log("mouseUP");
            setIsDragging(false);
            setDragStartPoint(null);

            if (!canvas) return;

            // dragStartPointと今の位置から、座標系Aのマウスの移動量を計算する
            const mouseMoveValueA: Point = {
                x: ((dragStartPoint && event)? event.x - dragStartPoint.x: 0),
                y: ((dragStartPoint && event)? event.y - dragStartPoint.y: 0),
            };
            const curCenterPointB: Point = (event)? calcCenterPos(mouseMoveValueA): centerPoint;

            // 座標系A・B間のマトリックスを得る
            const {matrixAB} = getMatrixAB(curCenterPointB, scale, canvas.width, canvas.height);

            const newCenterPoint: Point = applyMatrix(matrixAB, {x:canvas.width/2, y:canvas.height/2});
            setCenterPoint(newCenterPoint);
        }

        // draw
        // eventがあるときは、centerPointBeginningDragに、mouseMoveを加算して描画
        // eventがnullのときは、今のmouseMoveはゼロで、centerPointに従って描画
        function draw(event?: MouseEvent){
            if (!canvas) return;
            if (!context) return;
            //console.log("かくよ！");

            //console.log({dragStartPoint});
            //console.log({centerPoint});

            // dragStartPointと今の位置から、座標系Aのマウスの移動量を計算する
            const mouseMoveValueA: Point = {
                x: ((dragStartPoint && event)? event.x - dragStartPoint.x: 0),
                y: ((dragStartPoint && event)? event.y - dragStartPoint.y: 0),
            };
            const curCenterPointB = (event)? calcCenterPos(mouseMoveValueA): centerPoint;

            // 座標系A→Bのマトリックスを得る
            const {matrixAB, matrixBA} = getMatrixAB(curCenterPointB, scale, canvas.width, canvas.height);

            // 画面の左上と右下の座標系Bの座標を計算
            const leftTop: Point = applyMatrix(matrixAB, {x:0, y:0});
            const rightBottom: Point = applyMatrix(matrixAB, {x:canvas.width, y:canvas.height});
            // canvasの上下左右の座標系Bの座標値を得て、
            // その値に沿った絵を描く

            // 座標系Bの原点がある、座標系Aの座標値
            const centerPointB: Point = applyMatrix(matrixBA, {x:0, y:0});
            //console.log({centerPointB});
            
            // --- 描画開始 ---

            // 初期化
            context.clearRect(0, 0, canvas.width, canvas.height);

            // 中心軸
            context.beginPath();
            context.moveTo(centerPointB.x, centerPointB.y);
            context.lineTo(centerPointB.x + 10*scale, centerPointB.y);
            context.moveTo(centerPointB.x, centerPointB.y);
            context.lineTo(centerPointB.x, centerPointB.y + 10*scale);
            context.stroke();
        }

        function calcCenterPos(mouseMoveValueA: Point): Point {
            //console.log({mouseMoveValueA});
            // マウスの移動量に、今のscaleで割って、座標系Bの移動量を得る
            const mouseMoveValueB: Point = {
                x: mouseMoveValueA.x / scale,
                y: mouseMoveValueA.y / scale,
            };
            //console.log({mouseMoveValueB});
            // 今の座標系BのcenterPointを計算
            // centerPos：canvas中心点(座標系Aの(w/2, h/2)の位置)にある、座標系Bの座標値
            const curCenterPointB: Point = {
                x: centerPointBeginningDrag.x - mouseMoveValueB.x,
                y: centerPointBeginningDrag.y - mouseMoveValueB.y,
            };
            
            return curCenterPointB;
        }

        draw();

        canvas.addEventListener("mousedown", handleMouseDown);
        canvas.addEventListener("mousemove", handleMouseMove);
        canvas.addEventListener("mouseup", handleMouseUp);
        return () => {
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, centerPoint, scale]);

    // range関係
    function handleOnChangeRange() {
        if (!refRange) return;

        const inputRange = refRange.current;
        if (!inputRange) return;

        const inputValue: number = Number(inputRange.value);
        const newScale: number = Math.pow(10, inputValue/10)
        //console.log(newScale);
        setScale(newScale);
    }

    return (
        <>
            <canvas
                ref={refCanvas}
                style={{border: "1px solid #000"}}
            />
            <input
                type="range" 
                ref={refRange}
                onChange={handleOnChangeRange}
                min={-10}
                max={10}
                defaultValue={0}
            />
        </>
    );
}

// 座標系Aと座標系B間へ変換する行列を返す
function getMatrixAB(
    centerPos: Point,
    scale: number,
    canvasWidth: number,
    canvasHeight: number
): {matrixAB:number[][], matrixBA:number[][]} {
    // 座標系B→A（拡大→移動）
    const mBA = [
        [scale, 0, canvasWidth/2 - centerPos.x*scale],
        [0, scale, canvasHeight/2 - centerPos.y*scale],
        [0, 0, 1],
    ];
    const mAB = inverseMatrix(mBA);

    return {
        matrixAB: mAB,
        matrixBA: mBA,
    };
}

function inverseMatrix(matrix: number[][]): number[][] {
    const [a, b, c] = matrix[0];
    const [d, e, f] = matrix[1];
    const [g, h, i] = matrix[2];

    const det = a * e * i - a * f * h - b * d * i + b * f * g + c * d * h - c * e * g;

    if (det === 0) {
        throw new Error("Matrix is not invertible");
    }

    return [
        [(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det],
        [(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det],
        [(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det]
    ];
}

function applyMatrix(matrix: number[][], p: Point): Point {
    return {
        x: matrix[0][0] * p.x + matrix[0][2],
        y: matrix[1][1] * p.y + matrix[1][2]
    };
}
