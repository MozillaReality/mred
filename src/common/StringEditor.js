import React, {Component} from "react";

export class StringEditor extends Component {
    render() {
        const prop = this.props.def;
        if (prop.hasHints()) {
            const hints = prop.getHints()
            if (hints.multiline) {
                return <textarea value={this.props.value}
                                 onChange={this.props.onChange}
                                 onBlur={this.props.onBlur}
                />
            }
        }
        return <input type='string'
                      value={this.props.value}
                      onChange={this.props.onChange}
                      onBlur={this.props.onBlur}
        />
    }
}