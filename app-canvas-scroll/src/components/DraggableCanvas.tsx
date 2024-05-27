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
            console.log(event.button);

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
            // マウスの移動量に、今のscaleをかけて、座標系Bの移動量を得る
            const mouseMoveValueB: Point = {
                x: mouseMoveValueA.x * scale,
                y: mouseMoveValueA.y * scale,
            };
            // 今の座標系BのcenterPosを計算
            // centerPoint：canvas中心点(座標系Aの(w/2, h/2)の位置)にある、座標系Bの座標値
            const curCenterPointB: Point = {
                x: centerPointBeginningDrag.x - mouseMoveValueB.x,
                y: centerPointBeginningDrag.y - mouseMoveValueB.y,
            };
            console.log({curCenterPointB});

            // 座標系A→Bのマトリックスを得る
            const {matrixAB} = getMatrixAB(curCenterPointB, scale, canvas.width, canvas.height);

            const center: Point = applyMatrix(matrixAB, {x:canvas.width/2, y:canvas.height/2});
            setCenterPoint(center);
        }

        // draw
        // eventがあるときは、centerPointBeginningDragに、mouseMoveを加算して描画
        // eventがnullのときは、今のmouseMoveはゼロで、centerPointに従って描画
        function draw(event?: MouseEvent){
            if (!canvas) return;
            if (!context) return;
            //console.log("かくよ！");

            //console.log({dragStartPoint});
            //console.log(centerPoint);

            // dragStartPointと今の位置から、座標系Aのマウスの移動量を計算する
            const mouseMoveValueA: Point = {
                x: ((dragStartPoint && event)? event.x - dragStartPoint.x: 0),
                y: ((dragStartPoint && event)? event.y - dragStartPoint.y: 0),
            };
            //console.log({mouseMoveValueA});
            // マウスの移動量に、今のscaleをかけて、座標系Bの移動量を得る
            const mouseMoveValueB: Point = {
                x: mouseMoveValueA.x * scale,
                y: mouseMoveValueA.y * scale,
            };
            //console.log({mouseMoveValueB});
            // 今の座標系BのcenterPointを計算
            // centerPos：canvas中心点(座標系Aの(w/2, h/2)の位置)にある、座標系Bの座標値
            const curCenterPointB: Point = (event)
                ? {
                    x: centerPointBeginningDrag.x - mouseMoveValueB.x,
                    y: centerPointBeginningDrag.y - mouseMoveValueB.y,
                }
                : centerPoint;
            //console.log({curCenterPointB});

            // 座標系A→Bのマトリックスを得る
            const {matrixAB, matrixBA} = getMatrixAB(curCenterPointB, scale, canvas.width, canvas.height);

            // 画面の左上と右下の座標系Bの座標を計算
            const leftTop: Point = applyMatrix(matrixAB, {x:0, y:0});
            const rightBottom: Point = applyMatrix(matrixAB, {x:canvas.width, y:canvas.height});
            //console.log({leftTop});
            //console.log({rightBottom});

            // 座標系Bの原点がある、座標系Aの座標値
            const centerPointB: Point = applyMatrix(matrixBA, {x:0, y:0});
            //console.log({centerPointB});
            
            // --- 描画開始 ---

            // 初期化
            context.clearRect(0, 0, canvas.width, canvas.height);

            // 中心軸
            context.beginPath();
            context.moveTo(centerPointB.x, centerPointB.y);
            context.lineTo(centerPointB.x + 100*scale, centerPointB.y);
            context.moveTo(centerPointB.x, centerPointB.y);
            context.lineTo(centerPointB.x, centerPointB.y + 100*scale);
            context.stroke();
        }

        //console.log("これからかくのはデフォルト");
        draw();
        //console.log("デフォルトおわり");

        canvas.addEventListener("mousedown", handleMouseDown);
        canvas.addEventListener("mousemove", handleMouseMove);
        canvas.addEventListener("mouseup", handleMouseUp);
        return () => {
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, centerPoint]);

    return (
        <>
            <canvas
                ref={refCanvas}
                style={{border: "1px solid #000"}}
            />
        </>
    );
}

// 座標系Aから座標系Bへ変換する行列を返す
function getMatrixAB(
    centerPos: Point,
    scale: number,
    canvasWidth: number,
    canvasHeight: number
): {matrixAB:number[][], matrixBA:number[][]} {
    // canvasの中心の座標がcenterPosなので、
    // (-w/2, -h/2)だけ移動している
    return {
        matrixAB: [
            [scale, 0, -1*(canvasWidth/2 - centerPos.x)],
            [0, scale, -1*(canvasHeight/2 - centerPos.y)],
            [0, 0, 1]
        ],
        matrixBA: [
            [1/scale, 0, (canvasWidth/2 - centerPos.x)],
            [0, 1/scale, (canvasHeight/2 - centerPos.y)],
            [0, 0, 1]
        ]
    };
}

function applyMatrix(matrix: number[][], p: Point): Point {
    return {
        x: matrix[0][0] * p.x + matrix[0][2],
        y: matrix[1][1] * p.y + matrix[1][2]
    };
}
