import { State } from "../../state";

export function emit_change_on_set_behavior<STATE, EVENTABLE, ENGINE>(): (
	state: State<STATE>,
	eventable: EVENTABLE,
) => ENGINE {
	return (state, eventable) => {
		state.set.register({
			handler: {
				name: "emit-change-on-set",
				handle: (arg) => {
					eventable.emit("change", arg.state);
				},
			},
		});
	};
}
