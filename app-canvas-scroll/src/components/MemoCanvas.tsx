// [HTML の canvas 要素で手書きメモの undo / redo を再現する（React x TypeScript） #React - Qiita](https://qiita.com/moenar014/items/cdc4c758017b1f8f4da1)

import { forwardRef, Ref } from "react";

type MouseOrTouchEventHandler<T = Element> = React.EventHandler<
  React.MouseEvent<T> | React.TouchEvent<T>
>;
type Props = {
  drawStart: MouseOrTouchEventHandler;
  drawMove: MouseOrTouchEventHandler;
  endDrawing: MouseOrTouchEventHandler;
};

function Component(
  { drawStart, drawMove, endDrawing }: Props,
  ref: Ref<HTMLCanvasElement>
) {
    console.log("びょうが!");

    return (
        <>
            <canvas
                ref={ref}
                onMouseDown={drawStart}
                onMouseMove={drawMove}
                onMouseUp={endDrawing}
                onTouchStart={drawStart}
                onTouchMove={drawMove}
                onTouchEnd={endDrawing}
                width="300"
                height="300"
            />
        </>
    );
}

export const MemoCanvas = forwardRef<HTMLCanvasElement, Props>(Component);
