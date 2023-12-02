import structuredClone from '@ungap/structured-clone';
import { useContext, useEffect, useRef, useState } from 'react';
import { Trash } from 'react-bootstrap-icons';
import Select from 'react-select';
import { GameInfoContext, GlobalStateContext } from './contexts';
import { ItemSelect } from './item_select';
import { ItemIcon } from './recipe';

function get_item_data(game_data) {
    //通过读取配方表得到配方中涉及的物品信息，item_data中的键名为物品名，键值为
    //此物品在计算器中的id与用于生产此物品的配方在配方表中的序号
    var item_data = {};
    var i = 0;
    for (var num = 0; num < game_data.recipe_data.length; num++) {
        for (var item in game_data.recipe_data[num].产物) {
            if (!(item in item_data)) {
                item_data[item] = [i];
                i++;
            }
            item_data[item].push(num);
        }
    }
    return item_data;
}

export function NeedsList({ needs_list, set_needs_list }) {
    const global_state = useContext(GlobalStateContext);
    let game_data = global_state.game_data;

    const [item, set_item] = useState("宇宙矩阵");
    const count_ref = useRef(60);

    let item_data = get_item_data(game_data);

    let needs_doms = Object.entries(needs_list).map(([item, count]) => {
        function edit_count(e) {
            let new_needs_list = structuredClone(needs_list);
            new_needs_list[item] = Number(e.target.value);
            set_needs_list(new_needs_list);
        }
        function remove() {
            let new_needs_list = structuredClone(needs_list);
            delete new_needs_list[item];
            set_needs_list(new_needs_list);
        }

        return <div key={item} className="d-inline-flex align-items-center">
            <ItemIcon item={item} />
            <span className="ms-1 me-2">x</span>
            <div key={item} className="input-group w-fit d-inline-flex">
                <input type="text" className="form-control" style={{ width: "6em" }} value={count} onChange={edit_count} />
                <span className="input-group-text">/min</span>
                <button className="btn btn-outline-danger" onClick={remove}>删除 <Trash /></button>
            </div>
        </div>
    });

    function add_need(item) {
        if (!(item in item_data)) {
            alert("请输入或选择正确的物品名字！");
            return;
        }
        let count = Number(count_ref.current.value);
        let new_needs_list = structuredClone(needs_list);
        new_needs_list[item] = (needs_list[item] || 0) + count;
        set_needs_list(new_needs_list);
    }

    return <>
        <div className="alert alert-light py-2">
            增加需求：
            <div key={item} className="input-group w-fit d-inline-flex">
                <input type="text" className="form-control" style={{ width: "6em" }} ref={count_ref} defaultValue={60} />
                <span className="input-group-text">/min</span>
                <ItemSelect item={item} set_item={item => { set_item(item); add_need(item); }} />
                <button className="btn btn-outline-primary" onClick={() => add_need(item)}>增加</button>
            </div>

            {Object.keys(needs_list).length == 0 ||
                <div className="d-flex flex-wrap gap-4 row-gap-2 mt-3">
                    {needs_doms}
                    <button className="btn btn-outline-danger ms-2" onClick={() => set_needs_list({})}>清空所有需求</button>
                </div>}
        </div>
    </>;
}

export function NeedsListStorage({ needs_list, set_needs_list }) {
    const game_info = useContext(GameInfoContext);
    let game_name = game_info.name;

    const NEEDS_LIST_STORAGE_KEY = "needs_list";

    const all_saved = JSON.parse(localStorage.getItem(NEEDS_LIST_STORAGE_KEY)) || {};
    const [all_scheme, set_all_scheme] = useState(all_saved[game_name] || {});
    // TODO implement 实时保存
    const NULL_SELECTION = { value: null, label: "（无）" };
    const [current_selection, set_current_selection] = useState(NULL_SELECTION);

    useEffect(() => {
        let game_name = game_info.name;
        let all_scheme_data = JSON.parse(localStorage.getItem(NEEDS_LIST_STORAGE_KEY)) || {};
        let all_scheme_init = all_scheme_data[game_name] || {};
        console.log("Loading storage", game_name, Object.keys(all_scheme_init));
        set_all_scheme(all_scheme_init);
        set_current_selection(NULL_SELECTION);
    }, [game_info]);

    useEffect(() => {
        let all_scheme_saved = JSON.parse(localStorage.getItem(NEEDS_LIST_STORAGE_KEY)) || {};
        all_scheme_saved[game_name] = all_scheme;
        localStorage.setItem(NEEDS_LIST_STORAGE_KEY, JSON.stringify(all_scheme_saved));
    }, [all_scheme])

    function delete_() {
        if (!current_selection) return;
        let name = current_selection.value;
        if (name in all_scheme) {
            if (!confirm(`即将删除名为${name}的需求列表，是否继续`)) {
                return;// 用户取消保存
            }
            let all_scheme_copy = structuredClone(all_scheme);
            delete all_scheme_copy[name];
            set_all_scheme(all_scheme_copy);
            set_current_selection(NULL_SELECTION);
        }
    }//删除当前保存的策略

    function load() {
        if (!current_selection) return;
        let name = current_selection.value;
        if (all_scheme[name]) {
            set_needs_list(all_scheme[name]);
        } else {
            alert(`未找到名为${name}的需求列表`);
        }
    }//读取生产策略

    function save() {
        let name = prompt("输入需求列表名");
        if (!name) return;
        if (name in all_scheme) {
            if (!confirm(`已存在名为${name}的需求列表，继续保存将覆盖原需求列表`)) {
                return;// 用户取消保存
            }
        }
        let all_scheme_copy = structuredClone(all_scheme);
        all_scheme_copy[name] = structuredClone(needs_list);
        set_all_scheme(all_scheme_copy);
        set_current_selection({ value: name, label: name });
    }//保存生产策略

    let options = Object.keys(all_scheme).map(scheme_name =>
        ({ value: scheme_name, label: scheme_name }));

    return <><div>
        <button onClick={save}>保存需求列表为</button>
        <div style={{ display: "inline-flex" }}>
            <Select value={current_selection} onChange={set_current_selection} options={options} isSearchable={false} />
        </div>
        <button onClick={load}>加载需求列表</button>
        <button onClick={delete_}>删除需求列表</button>
    </div ></>;
}

