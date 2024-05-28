import { useRef, useEffect, useState } from "react";

const SCALE_MM = {
    min: -10,
    max: 10,
};

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

    // 座標系Bの原点が、座標系Aのどこにあるかを示す値
    // ドラッグ中は変更せず、mouseupで確定したら変更する
    const [originBinA, setOriginBinA] = useState<Point>({x: 10, y:10});
    // Aに対するBの拡大率．Bの方が大きい時、１より大
    const [scale, setScale] = useState<number>(1.0);

    // ドラッグしている状態
    const [isDragging, setIsDragging] = useState<boolean>(false);
    // ドラッグの開始位置
    const [dragStartPoint, setDragStartPoint] = useState<Point|null>(null);
    

    // canvasのref
    const refCanvas = useRef<HTMLCanvasElement>(null);
    // inputのref
    const refRange = useRef<HTMLInputElement>(null);
    
    // 初期化処理
    useEffect(() => {
        if (!refCanvas) return;
        const canvas = refCanvas.current;
        if (!canvas) return;
        
        canvas.width = 500;
        canvas.height = 400;
    },[]);

    // 操作系
    useEffect(() => {
        // contextを取得
        if (!refCanvas) return;
        const canvas = refCanvas.current;
        if (!canvas) return;
        const context = canvas.getContext("2d");
        if (!context) return;
        if (!refRange) return;
        const range = refRange.current;
        if (!range) return;

        // mouseDown
        function handleMouseDown(event: MouseEvent) {
            setIsDragging(true);
            setDragStartPoint({x: event.clientX, y: event.clientY});
            draw(originBinA);
            //console.log("mousedown");
        }

        // mouseMove
        function handleMouseMove(event: MouseEvent) {
            if (!isDragging) return;
            //console.log("mousemove");

            // 今のOriginB
            const movingOriginBinA = getOriginBinADragging({x: event.clientX, y: event.clientY}); 
            //console.log(movingOriginBinA);
            if (!movingOriginBinA) return;

            // 描画
            draw(movingOriginBinA)
        }

        // mouseUp
        function handleMouseUp(event: MouseEvent) {
            if (!isDragging) return;
            
            // originBinAを移動する
            const finalOriginBinA = getOriginBinADragging({x: event.clientX, y: event.clientY});
            if (finalOriginBinA){
                setOriginBinA(finalOriginBinA);
            } else {
                // 通常考えられないが、なにかあったら原点に戻す
                console.error("finalOriginBinA is not found");
                setOriginBinA({x:0, y:0});
            }

            setIsDragging(false);
            setDragStartPoint(null);
        }

        // wheel
        function handleWheelScroll(event: WheelEvent) {
            if (!refRange) return;
            const inputRange = refRange.current;
            if (!inputRange) return;

            // マウスホイールの方向による更新値
            const wheelUp = (event.deltaY<0)? 1: -1;
            
            // 今のinputRangeから１つ上げ下げする
            const newInputRangeValue
                = Number(inputRange.value) + wheelUp;
            inputRange.value = String(newInputRangeValue);

            // inputRangeValueからscale値に変換
            const newScale: number = rangeValue2Scale(
                newInputRangeValue
            );

            // マウス位置を中心に拡大縮小
            zoomAround(
                newScale,
                {x: event.clientX, y: event.clientY}
            );
        }
    
        // rangeChanged
        function handleOnChangeRange(){
            if (!refRange) return;
    
            const inputRange = refRange.current;
            if (!inputRange) return;
    
            // 新しいスケール値
            const newScale: number = rangeValue2Scale(
                Number(inputRange.value)
            );
    
            // 拡大縮小処理
            zoomAround(newScale);
        }

        // ドラッグ中のoriginBinAを返す
        function getOriginBinADragging(curMousePos: Point): Point|void{
            if (!isDragging) return;
            if (!dragStartPoint) return;

            return {
                x: originBinA.x - dragStartPoint.x + curMousePos.x,
                y: originBinA.y - dragStartPoint.y + curMousePos.y,
            };
        }

        // 座標系Bの要素を座標系Aで描画
        function draw(paramOriginBinA?: Point) {
            if (!canvas) return;
            if (!context) return;

            // 今の座標系Bの原点位置
            const curOriginBinA = paramOriginBinA? paramOriginBinA: originBinA;

            // 座標計算
            const { matrixBA } = getMatrix(curOriginBinA);

            // 初期化
            context.clearRect(0, 0, canvas.width, canvas.height);

            // 中心軸
            context.beginPath();
            context.moveTo(curOriginBinA.x, curOriginBinA.y);
            context.lineTo(curOriginBinA.x+10*scale, curOriginBinA.y);
            context.moveTo(curOriginBinA.x, curOriginBinA.y);
            context.lineTo(curOriginBinA.x, curOriginBinA.y+10*scale);
            context.stroke();
            
            // （試行）
            // 座標系Bの(-10, 0)の位置にR=10の円を描く
            const posCircleCenter: Point = applyMatrix(matrixBA, {x:10, y:20});
            context.fillStyle = "#f00";
            context.beginPath();
            context.arc(posCircleCenter.x, posCircleCenter.y, 5*scale, 0, Math.PI*2);
            context.fill();
        }

        // 座標系A、B間のmatrixを取得する
        function getMatrix(currentOriginBinA?: Point): {matrixAB: number[][], matrixBA: number[][]} {
            const curOriginBinA = currentOriginBinA? currentOriginBinA: originBinA;
            
            // B→Aの変換
            // 原点移動→拡大
            const mBA = [
                [scale, 0, curOriginBinA.x],
                [0, scale, curOriginBinA.y],
                [0, 0, 1],
            ];
            const mAB = inverseMatrix(mBA);
        
            return {
                matrixAB: mAB,
                matrixBA: mBA,
            };
        }
    
        // 新しいscale値によるoriginBinAの値の更新と、ついでにscale値の更新
        function zoomAround(newScale: number, propCenter?: Point){
            if (!refCanvas) return;
            if (!refCanvas.current) return;
    
            // 拡大中心点（座標系A）
            const zoomCenter: Point = propCenter
                ? propCenter
                : {x: refCanvas.current.width/2, y: refCanvas.current.height/2}
                //: {x: 10, y: 10}
            ;
    
            // 拡大中心点→originBinAを、newScale/scale 倍した先が新しいoriginBinAとなる
    
            // zoomCenter to OriginBinA ベクトル
            const vecZC2OB: Point = {
                x: (originBinA.x - zoomCenter.x) * newScale / scale,
                y: (originBinA.y - zoomCenter.y) * newScale / scale,
            };
    
            // 新しいoriginBinA
            const newOriginBinA = {
                x: zoomCenter.x + vecZC2OB.x,
                y: zoomCenter.y + vecZC2OB.y,
            };
            //console.log(newOriginBinA);
    
            setOriginBinA(newOriginBinA);
            setScale(newScale);
        }

        // 描画
        draw();

        canvas.addEventListener("mousedown", handleMouseDown);
        canvas.addEventListener("mousemove", handleMouseMove);
        canvas.addEventListener("mouseup", handleMouseUp);
        canvas.addEventListener("mouseleave", handleMouseUp);
        canvas.addEventListener("wheel", handleWheelScroll, { passive: true });
        range.addEventListener("input", handleOnChangeRange);
        return () => {
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseup', handleMouseUp);
            canvas.removeEventListener('mouseleave', handleMouseUp);
            canvas.removeEventListener('wheel', handleWheelScroll);
            range.removeEventListener('input', handleOnChangeRange);
        };
    }, [isDragging, originBinA, dragStartPoint, scale]);


    // スライドバーのスケール値から、座標系Bのscale値へ変換する
    function rangeValue2Scale(value: number) {
        return Math.pow(10, Number(value)/10);
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
                min={SCALE_MM.min}
                max={SCALE_MM.max}
                defaultValue={0}
            />
        </>
    )
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
