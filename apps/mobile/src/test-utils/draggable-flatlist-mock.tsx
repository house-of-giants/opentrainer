import { Fragment, ReactNode } from "react";
import { ScrollView, View } from "react-native";

// Jest replacement for react-native-draggable-flatlist. Renders every item
// inline (no gestures) and records the latest data + onDragEnd handler per
// testID so tests can trigger reorders directly:
//
//   jest.mock("react-native-draggable-flatlist", () =>
//     require("../test-utils/draggable-flatlist-mock"),
//   );
//   dragState.handlers["day-exercise-list-0"]({ data: reordered, from, to });
//
// (jest.mock factories cannot contain JSX here: NativeWind's babel plugin
// rewrites createElement to an out-of-scope module import.)
export type DragEndParams = { data: unknown[]; from: number; to: number };

export const dragState: {
  handlers: Record<string, (params: DragEndParams) => void>;
  data: Record<string, unknown[]>;
  reset: () => void;
} = {
  handlers: {},
  data: {},
  reset() {
    this.handlers = {};
    this.data = {};
  },
};

export const NestableScrollContainer = ScrollView;

export function ScaleDecorator({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

interface MockListProps {
  data: unknown[];
  renderItem: (info: {
    item: unknown;
    drag: () => void;
    isActive: boolean;
    getIndex: () => number;
  }) => ReactNode;
  keyExtractor?: (item: unknown, index: number) => string;
  onDragEnd?: (params: DragEndParams) => void;
  testID?: string;
}

export function NestableDraggableFlatList({
  data,
  renderItem,
  keyExtractor,
  onDragEnd,
  testID,
}: MockListProps) {
  if (testID && onDragEnd) {
    // Intentional module-level registry so tests can invoke onDragEnd; this
    // is a jest-only mock, never rendered in the app.
    // eslint-disable-next-line react-hooks/immutability
    dragState.handlers[testID] = onDragEnd;
    // eslint-disable-next-line react-hooks/immutability
    dragState.data[testID] = data;
  }
  return (
    <View testID={testID}>
      {data.map((item, index) => (
        <Fragment key={keyExtractor ? keyExtractor(item, index) : String(index)}>
          {renderItem({
            item,
            drag: () => {},
            isActive: false,
            getIndex: () => index,
          })}
        </Fragment>
      ))}
    </View>
  );
}
